import { and, desc, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  builds,
  snapshotKeySpec,
  snapshots,
  type CaptureSpec,
  type Snapshot,
} from '@driftwatch/core';
import { db } from '../db';
import { HttpError, requireProject } from '../auth';
import { captureQueue } from '../queue';
import { store } from '../store';

const createSchema = z.object({
  branch: z.string().min(1).max(100).default('main'),
  commitSha: z.string().min(8).max(64).nullish(),
  prNumber: z.number().int().positive().nullish(),
  captures: z
    .object({
      name: z.string().min(1).max(64),
      url: z.url(),
      browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
      viewport: z
        .object({
          width: z.number().int().min(64).max(3840),
          height: z.number().int().min(64).max(2160),
        })
        .default({ width: 1280, height: 720 }),
      fullPage: z.boolean().default(false),
      maskSelectors: z.array(z.string().min(1).max(256)).max(20).default([]),
      delayMs: z.coerce.number().int().min(0).max(30000).default(0),
    })
    .array()
    .min(1)
    .max(50),
});

async function urlOrNull(key: string | null): Promise<string | null> {
  return key ? store.publicUrl(key) : Promise.resolve(null);
}

/** Snapshot DTO for the UI, with image URLs resolved through the active storage driver. */
async function toSnapshotDto(row: Snapshot) {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    browser: row.browser,
    viewport: { width: row.viewportWidth, height: row.viewportHeight },
    status: row.status,
    review: row.review,
    diffPercent: row.diffPercent,
    screenshotUrl: await urlOrNull(row.screenshotKey),
    baselineUrl: await urlOrNull(row.baselineKey),
    diffUrl: await urlOrNull(row.diffKey),
  };
}

export async function buildRoutes(app: FastifyInstance) {
  app.post('/builds', async (request, reply) => {
    const project = await requireProject(request);
    const body = createSchema.parse(request.body);

    const seen = new Set<string>();
    for (const capture of body.captures) {
      const key = snapshotKeySpec(capture.name, capture.browser, capture.viewport);
      if (seen.has(key)) {
        return reply.status(400).send({ error: `duplicate capture: ${key}` });
      }
      seen.add(key);
    }

    const [build] = await db
      .insert(builds)
      .values({
        projectId: project.id,
        branch: body.branch,
        commitSha: body.commitSha ?? null,
        prNumber: body.prNumber ?? null,
      })
      .returning();

    const rows = body.captures.map((capture) => ({
      buildId: build.id,
      projectId: project.id,
      key: snapshotKeySpec(capture.name, capture.browser, capture.viewport),
      name: capture.name,
      url: capture.url,
      browser: capture.browser,
      viewportWidth: capture.viewport.width,
      viewportHeight: capture.viewport.height,
    }));
    await db.insert(snapshots).values(rows);

    await captureQueue.addBulk(
      body.captures.map((capture: CaptureSpec) => ({
        name: 'capture',
        data: { buildId: build.id, projectId: project.id, capture },
        opts: { attempts: 3, backoff: { type: 'exponential' as const, delay: 5000 } },
      })),
    );

    return reply.status(201).send({
      build: { id: build.id, status: build.status },
      captures: rows.length,
    });
  });

  app.get('/builds', async (request) => {
    const project = await requireProject(request);
    const rows = await db
      .select()
      .from(builds)
      .where(eq(builds.projectId, project.id))
      .orderBy(desc(builds.createdAt))
      .limit(20);

    const snapshotRows =
      rows.length === 0
        ? []
        : await db
            .select({
              buildId: snapshots.buildId,
              status: snapshots.status,
              review: snapshots.review,
            })
            .from(snapshots)
            .where(inArray(snapshots.buildId, rows.map((b) => b.id)));

    const empty = { total: 0, pending: 0, new: 0, changed: 0, unchanged: 0 };
    const counts = new Map<string, typeof empty>();
    for (const row of snapshotRows) {
      const bucket = counts.get(row.buildId) ?? { ...empty };
      bucket.total += 1;
      bucket[row.status] += 1;
      counts.set(row.buildId, bucket);
    }

    return rows.map((build) => ({ ...build, snapshotCounts: counts.get(build.id) ?? empty }));
  });

  app.get<{ Params: { id: string } }>('/builds/:id', async (request) => {
    const project = await requireProject(request);
    const [build] = await db
      .select()
      .from(builds)
      .where(and(eq(builds.id, request.params.id), eq(builds.projectId, project.id)))
      .limit(1);
    if (!build) {
      throw new HttpError(404, 'build not found');
    }

    const rows = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.buildId, build.id))
      .orderBy(desc(snapshots.createdAt));

    return {
      build,
      snapshots: await Promise.all(rows.map(toSnapshotDto)),
    };
  });
}