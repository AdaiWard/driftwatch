import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { projects, type Project } from '@driftwatch/core';
import type { FastifyRequest } from 'fastify';
import { db } from './db';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function generateApiKey(): string {
  return `dw_${randomBytes(24).toString('base64url')}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/** Auth for CI clients: x-api-key header -> sha256 -> project lookup. */
export async function requireProject(request: FastifyRequest): Promise<Project> {
  const header = request.headers['x-api-key'];
  if (typeof header !== 'string' || header.length === 0) {
    throw new HttpError(401, 'missing x-api-key header');
  }
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.apiKeyHash, hashApiKey(header)))
    .limit(1);
  if (!project) {
    throw new HttpError(401, 'invalid api key');
  }
  return project;
}