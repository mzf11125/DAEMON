/** LangSmith / LangChain tracing hooks (optional). */
export function tracingEnabled(): boolean {
  return process.env.LANGCHAIN_TRACING_V2 === "true";
}

export function tracingProject(): string | undefined {
  return process.env.LANGCHAIN_PROJECT;
}
