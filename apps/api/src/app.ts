import Fastify from 'fastify';
import { ZodError } from 'zod';
import { buildRoutes } from './routes/builds';
import { fileRoutes } from './routes/files';
import { projectRoutes } from './routes/projects';
import { snapshotRoutes } from './routes/snapshots';
import { HttpError } from './auth';
import { config } from './env';

export async function buildApp() {
  const app = Fastify({ logger: config.LOG_LEVEL === 'debug' });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.register(projectRoutes, { prefix: '/api/v1' });
  app.register(buildRoutes, { prefix: '/api/v1' });
  app.register(snapshotRoutes, { prefix: '/api/v1' });
  app.register(fileRoutes);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'validation failed', issues: error.issues });
    }
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'internal error' });
  });

  return app;
}