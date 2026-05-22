export function maxPromptChars(): number {
  return Number(process.env.AIP_MAX_PROMPT_CHARS ?? 12_000);
}

export function maxOutputTokens(): number {
  return Number(process.env.AIP_MAX_OUTPUT_TOKENS ?? 1024);
}
