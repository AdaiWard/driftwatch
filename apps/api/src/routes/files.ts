import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { HttpError } from '../auth';
import { store } from '../store';
import { config } from '../env';

/** Serves images straight from disk in the fs profile; with s3 the UI gets presigned URLs instead. */
export async function fileRoutes(app: FastifyInstance) {
  if (config.STORAGE_DRIVER !== 'fs') {
    return;
  }

  app.get<{ Params: { '*': string } }>('/files/*', async (request, reply) => {
    let key: string;
    try {
      key = decodeURIComponent(request.params['*']);
    } catch {
      throw new HttpError(400, 'malformed url');
    }

    let body: Buffer;
    try {
      body = await store.get(key);
    } catch {
      throw new HttpError(404, 'not found');
    }

    reply.header('content-type', 'image/png').header('cache-control', 'private, max-age=86400');
    return body;
  });
}