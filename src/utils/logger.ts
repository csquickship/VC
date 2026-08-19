export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export function log(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [${level}] [${context}] ${message}${metaStr}`);
}
