import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { projects } from '@driftwatch/core';
import { db } from '../db';
import { generateApiKey, hashApiKey, requireProject } from '../auth';

const createSchema = z.object({
  name: z.string().min(1).max(64),
});

export async function projectRoutes(app: FastifyInstance) {
  /** Returns the API key exactly once: only its sha256 is stored. */
  app.post('/projects', async (request, reply) => {
    const body = createSchema.parse(request.body);
    const apiKey = generateApiKey();
    try {
      const [project] = await db
        .insert(projects)
        .values({ name: body.name, apiKeyHash: hashApiKey(apiKey) })
        .returning();
      return reply.status(201).send({ id: project.id, name: project.name, apiKey });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        return reply.status(409).send({ error: `project name '${body.name}' already exists` });
      }
      throw error;
    }
  });

  app.get('/whoami', async (request) => {
    const project = await requireProject(request);
    return { id: project.id, name: project.name };
  });
}