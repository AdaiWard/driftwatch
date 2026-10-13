import { createDb } from '@driftwatch/core';
import { config } from './env';

export const db = createDb(config.DATABASE_URL);