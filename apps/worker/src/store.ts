import { createObjectStore, type ObjectStore } from '@driftwatch/core';
import { config } from './env';

export const store: ObjectStore = await createObjectStore(config);