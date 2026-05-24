# company-research (reference)

Upstream Tavily company-research LangGraph example (MIT).

Ported to `market_intel.pipeline.l1_graph` with:

- `search_dedup` + curator
- `extract_and_summarize` on top URLs
- Editor pass + optional AI visibility (GEO/AIO/E-E-A-T)

Maps/PDF/Mongo paths from upstream are intentionally omitted (L3 uses pgvector instead).
