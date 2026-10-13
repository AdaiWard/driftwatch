import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import type { CaptureJobData } from '@driftwatch/core';
import { config } from './env';

export const QUEUE_NAME = 'capture';

// BullMQ 6 in native ESM wants a fully constructed client instance
const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const captureQueue = new Queue<CaptureJobData>(QUEUE_NAME, { connection });