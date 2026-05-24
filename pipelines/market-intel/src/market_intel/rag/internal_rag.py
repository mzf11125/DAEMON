"""pgvector retrieval + simple Q&A."""

from __future__ import annotations

from typing import Any

import psycopg
from langchain_core.messages import HumanMessage, SystemMessage
from pgvector.psycopg import register_vector

from market_intel.config import Settings, get_settings
from market_intel.openai_client import embedding_model_id, openai_compatible_client
from market_intel.security import sanitize_user_query
from market_intel.toolkit.model_config import init_chat_model


def _embed_query(query: str, settings: Settings) -> list[float]:
    client = openai_compatible_client(settings)
    return client.embeddings.create(model=embedding_model_id(settings), input=[query]).data[0].embedding


def retrieve_chunks(
    thread_id: str,
    query: str,
    *,
    top_k: int = 5,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    settings = settings or get_settings()
    qvec = _embed_query(query, settings)
    with psycopg.connect(settings.database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chunk_id, url, content, source_type,
                       1 - (embedding <=> %s::vector) AS score
                FROM market_intel_chunks
                WHERE thread_id = %s AND tenant_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (qvec, thread_id, settings.tenant_id, qvec, top_k),
            )
            rows = cur.fetchall()
    out = []
    for chunk_id, url, content, source_type, score in rows:
        out.append(
            {
                "chunk_id": chunk_id,
                "url": url,
                "content": content,
                "source_type": source_type,
                "score": float(score),
            }
        )
    return out


def ask_internal(
    thread_id: str,
    question: str,
    *,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    question = sanitize_user_query(question)
    chunks = retrieve_chunks(thread_id, question, settings=settings)
    if not chunks:
        return {"answer": "No internal chunks found for thread.", "citations": []}

    ctx = "\n\n".join(
        f"[INTERNAL {i}] {c['url']}\n{c['content'][:2000]}" for i, c in enumerate(chunks, 1)
    )
    llm = init_chat_model(settings)
    msg = llm.invoke(
        [
            SystemMessage(content="Answer using INTERNAL sources only. Cite [INTERNAL n]."),
            HumanMessage(content=f"Question: {question}\n\n{ctx}"),
        ]
    )
    answer = msg.content if isinstance(msg.content, str) else str(msg.content)
    citations = [{"url": c["url"], "chunk_id": c["chunk_id"]} for c in chunks]
    return {"answer": answer, "citations": citations, "chunks": chunks}
