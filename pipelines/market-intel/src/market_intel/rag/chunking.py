"""Text chunking for crawl2rag."""

from __future__ import annotations

import re
from typing import Iterator


def chunk_text(text: str, *, chunk_size: int = 1200, overlap: int = 150) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def iter_page_chunks(pages: list[dict], *, chunk_size: int = 1200) -> Iterator[tuple[str, str, dict]]:
    for page in pages:
        url = page.get("url") or page.get("source_url") or ""
        body = page.get("raw_content") or page.get("content") or page.get("markdown") or ""
        if not body:
            continue
        for i, ch in enumerate(chunk_text(body, chunk_size=chunk_size)):
            yield url, ch, {"chunk_index": i}
