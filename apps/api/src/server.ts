import { buildApp } from './app';
import { config } from './env';

const app = await buildApp();

await app.listen({ port: config.PORT, host: '0.0.0.0' });
console.log(`[driftwatch-api] listening on :${config.PORT} (storage: ${config.STORAGE_DRIVER})`);