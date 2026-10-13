/**
 * Minimal BullMQ-compatible connection settings parsed from a plain
 * redis:// URL. Lives in core so API and worker share one parser,
 * without dragging bullmq into core's dependency tree.
 */
export function redisConnectionOptions(url: string): {
  host: string;
  port: number;
  password?: string;
} {
  const parsed = new URL(url);
  const port = parsed.port.length > 0 ? Number(parsed.port) : 6379;
  return {
    host: parsed.hostname,
    port,
    ...(parsed.password ? { password: parsed.password } : {}),
  };
}