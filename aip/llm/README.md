# LLM gateway (Phase 2)

Small OpenAI-compatible HTTP proxy for agent and eval traffic.

## Endpoints

- `GET /health`
- `POST /v1/chat/completions` — forwards to OpenRouter, Ollama, or LM Studio

## Run

```bash
pnpm --filter @daemon/llm-gateway build
LLM_GATEWAY_PORT=8092 pnpm --filter @daemon/llm-gateway start
```

Enable from agents:

```bash
export LLM_GATEWAY_ENABLED=true
export LLM_GATEWAY_URL=http://localhost:8092
```

## Environment

| Variable | Default |
|----------|---------|
| `LLM_GATEWAY_PORT` | `8092` |
| `LLM_PROVIDER` | `openrouter` |
| `LLM_MODEL` | `openai/gpt-4o-mini` |
| `LLM_MODEL_ALLOWLIST` | (optional comma list) |
| `LLM_GATEWAY_TIMEOUT_MS` | `60000` |

See repo `.env.example` for provider API keys.
