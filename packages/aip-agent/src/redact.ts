/** Redact obvious secrets and PII before logging or trace export. */
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export function redactForLog(input: string): string {
  return input
    .replace(EMAIL, "[email]")
    .replace(JWT, "[jwt]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
