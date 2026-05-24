# Market Intelligence Pipeline

Tavily-powered company research (L1), social/crawl/Shodan extended intel (L2), and pgvector RAG + hybrid research (L3).

## Setup

```bash
cd pipelines/market-intel
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
export TAVILY_API_KEY=...
export OPENROUTER_API_KEY=...   # preferred — same key as AIP (chat + embeddings via OpenRouter)
# export OPENAI_API_KEY=...     # optional direct OpenAI instead of OpenRouter
export MARKET_INTEL_MODEL=openrouter:openai/gpt-4o-mini
export DATABASE_URL=...     # L3 pgvector (Supabase local or Postgres with vector extension)
```

## CLI

```bash
market-intel company-brief --company "Example Corp" --domain example.com
market-intel competitor-scan --company "Example Corp" --competitors "Rival A,Rival B"
market-intel market-map --industry "logistics SaaS" --region US
market-intel social --company "Example Corp" --platform linkedin
market-intel vectorize --url https://example.com --thread-id example-corp
market-intel ask --thread-id example-corp --question "What is their pricing model?"
market-intel hybrid --thread-id example-corp --question "How do they compare on security?"
market-intel research --query "Market size for cold chain visibility" --model mini
```

## Prove (from repo root)

```bash
make market-intel-install
make prove-market-intel
make prove-market-intel-social
make prove-market-intel-rag
make prove-market-intel-hybrid
make prove-market-intel-research
make prove-market-intel-shodan    # skips without SHODAN_API_KEY
make prove-market-intel-security  # no Tavily required
```

Implementation uses `tavily-python` with local toolkit wrappers (`toolkit/retrieval.py`, etc.) — `tavily-agent-toolkit` is not published on PyPI.

See `docs/operations/market-intelligence-v1.md`.
