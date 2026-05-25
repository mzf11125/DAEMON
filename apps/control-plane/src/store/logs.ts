export interface LogEntry {
  serviceId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

// Circular buffer — keep last 1000 log entries in memory
export const logBuffer: LogEntry[] = [];
const MAX_LOGS = 1000;

export function pushLog(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}
