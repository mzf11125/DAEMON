export type LLMProvider = "openrouter" | "ollama" | "lmstudio";

export function resolveProvider(): LLMProvider {
  const p = (process.env.LLM_PROVIDER ?? "openrouter").toLowerCase();
  if (p === "ollama" || p === "lmstudio") {
    return p;
  }
  return "openrouter";
}

export function resolveBaseURL(provider: LLMProvider): string {
  switch (provider) {
    case "ollama":
      return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
    case "lmstudio":
      return process.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1";
    default:
      return process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  }
}

export function resolveAPIKey(): string {
  return (
    process.env.OPENROUTER_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.OLLAMA_API_KEY ??
    "not-needed"
  );
}
