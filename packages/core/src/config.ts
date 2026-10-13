import { z } from 'zod';

export const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).default(3000),
  DATABASE_URL: z.string().default('postgres://localhost:5432/driftwatch'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  STORAGE_DRIVER: z.enum(['fs', 's3']).default('fs'),
  FS_ROOT: z.string().default('.data/objects'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('driftwatch'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('driftwatch'),
  S3_SECRET_KEY: z.string().default('driftwatch-secret'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}