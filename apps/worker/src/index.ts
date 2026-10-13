import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import type { CaptureJobData } from '@driftwatch/core';
import { config } from './env';
import { processCapture, type CaptureResult } from './job';

// BullMQ 6 in native ESM wants a fully constructed client instance
const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker<CaptureJobData, CaptureResult>('capture', processCapture, {
  connection,
  concurrency: config.WORKER_CONCURRENCY,
});

worker.on('completed', (job, result) => {
  const diff =
    result.diffPercent != null ? ` (${(result.diffPercent * 100).toFixed(3)}% diff)` : '';
  console.log(`[driftwatch-worker] job ${job.id} done: ${result.status}${diff}`);
});

worker.on('failed', (job, err) => {
  console.error(`[driftwatch-worker] job ${job?.id ?? '?'} failed: ${err.message}`);
});

const shutdown = async () => {
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

console.log(
  `[driftwatch-worker] started, queue=capture, concurrency=${config.WORKER_CONCURRENCY}, storage=${config.STORAGE_DRIVER}`,
);