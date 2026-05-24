"""Embed and store chunks in pgvector."""

from __future__ import annotations

import json
import uuid
from typing import Any

import psycopg
from market_intel.openai_client import embedding_model_id, openai_compatible_client
from pgvector.psycopg import register_vector

from market_intel.config import Settings, get_settings
from market_intel.rag.chunking import iter_page_chunks
from market_intel.toolkit.crawl import crawl_site
from market_intel.toolkit.extract import extract_urls


def _connect(settings: Settings):
    conn = psycopg.connect(settings.database_url)
    register_vector(conn)
    return conn


def embed_texts(texts: list[str], settings: Settings) -> list[list[float]]:
    client = openai_compatible_client(settings)
    resp = client.embeddings.create(model=embedding_model_id(settings), input=texts)
    return [d.embedding for d in resp.data]


def vectorize_url(
    url: str,
    *,
    thread_id: str,
    limit: int = 5,
    source_type: str = "crawl",
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    settings.require_tavily()

    pages: list[dict[str, Any]] = []
    failed: list[Any] = []
    if source_type == "crawl":
        crawled = crawl_site(url, limit=limit, settings=settings)
        pages = crawled.get("results") or []
        failed = crawled.get("failed_results") or []
    else:
        ext = extract_urls([url], settings=settings)
        pages = ext.get("results") or []
        failed = ext.get("failed_results") or []

    chunks: list[tuple[str, str, dict]] = list(iter_page_chunks(pages))
    if not chunks:
        return {"thread_id": thread_id, "ingested": 0, "failed_results": failed}

    texts = [c[1] for c in chunks]
    vectors = embed_texts(texts, settings)

    ingested = 0
    with _connect(settings) as conn:
        with conn.cursor() as cur:
            for (page_url, content, meta), emb in zip(chunks, vectors):
                cur.execute(
                    """
                    INSERT INTO market_intel_chunks
                      (chunk_id, thread_id, tenant_id, url, content, embedding, source_type, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (chunk_id) DO UPDATE SET
                      content = EXCLUDED.content,
                      embedding = EXCLUDED.embedding,
                      metadata = EXCLUDED.metadata,
                      updated_at = NOW()
                    """,
                    (
                        uuid.uuid4().hex,
                        thread_id,
                        settings.tenant_id,
                        page_url or url,
                        content,
                        emb,
                        source_type,
                        json.dumps(meta),
                    ),
                )
                ingested += 1
        conn.commit()

    return {
        "thread_id": thread_id,
        "ingested": ingested,
        "failed_results": failed,
        "source_url": url,
    }


def upsert_web_enrichment(
    thread_id: str,
    web_results: list[dict[str, Any]],
    *,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Enrichment flywheel: persist gap-fill web hits back into pgvector."""
    settings = settings or get_settings()
    if not web_results:
        return {"thread_id": thread_id, "ingested": 0}

    pages = [
        {"url": r.get("url"), "raw_content": (r.get("content") or "")[:12000]}
        for r in web_results
        if (r.get("content") or "").strip()
    ]
    if not pages:
        return {"thread_id": thread_id, "ingested": 0}

    chunks: list[tuple[str, str, dict]] = list(iter_page_chunks(pages))
    if not chunks:
        return {"thread_id": thread_id, "ingested": 0}

    texts = [c[1] for c in chunks]
    vectors = embed_texts(texts, settings)
    ingested = 0
    with _connect(settings) as conn:
        with conn.cursor() as cur:
            for (page_url, content, meta), emb in zip(chunks, vectors):
                meta = {**meta, "is_test": False}
                cur.execute(
                    """
                    INSERT INTO market_intel_chunks
                      (chunk_id, thread_id, tenant_id, url, content, embedding, source_type, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, 'web_enrichment', %s::jsonb)
                    ON CONFLICT (chunk_id) DO UPDATE SET
                      content = EXCLUDED.content,
                      embedding = EXCLUDED.embedding,
                      metadata = EXCLUDED.metadata,
                      updated_at = NOW()
                    """,
                    (
                        uuid.uuid4().hex,
                        thread_id,
                        settings.tenant_id,
                        page_url,
                        content,
                        emb,
                        json.dumps(meta),
                    ),
                )
                ingested += 1
        conn.commit()
    return {"thread_id": thread_id, "ingested": ingested, "source_type": "web_enrichment"}


def seed_internal_chunk(
    thread_id: str,
    *,
    content: str,
    url: str = "internal://seed",
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Insert a single internal chunk (prove hybrid path)."""
    settings = settings or get_settings()
    vec = embed_texts([content], settings)[0]
    with _connect(settings) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO market_intel_chunks
                  (chunk_id, thread_id, tenant_id, url, content, embedding, source_type, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, 'web_enrichment', '{}'::jsonb)
                ON CONFLICT (chunk_id) DO NOTHING
                """,
                (uuid.uuid4().hex, thread_id, settings.tenant_id, url, content, vec),
            )
        conn.commit()
    return {"thread_id": thread_id, "seeded": True}
