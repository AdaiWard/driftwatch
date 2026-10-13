import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { builds, refreshBuildStatus, snapshots } from '@driftwatch/core';
import { db } from '../db';
import { HttpError, requireProject } from '../auth';

const reviewSchema = z.object({
  review: z.enum(['approved', 'rejected']),
});

export async function snapshotRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>('/snapshots/:id/review', async (request) => {
    const project = await requireProject(request);
    const { review } = reviewSchema.parse(request.body);

    const [row] = await db
      .select({ snapshot: snapshots, build: builds })
      .from(snapshots)
      .innerJoin(builds, eq(snapshots.buildId, builds.id))
      .where(eq(snapshots.id, request.params.id))
      .limit(1);

    if (!row || row.build.projectId !== project.id) {
      throw new HttpError(404, 'snapshot not found');
    }
    if (row.snapshot.status === 'pending') {
      throw new HttpError(409, 'snapshot is still being captured');
    }
    if (row.snapshot.review !== 'pending') {
      throw new HttpError(409, `snapshot already reviewed: ${row.snapshot.review}`);
    }

    await db
      .update(snapshots)
      .set({ review, reviewedAt: new Date() })
      .where(eq(snapshots.id, row.snapshot.id));
    await refreshBuildStatus(db, row.build.id);

    return { ok: true, id: row.snapshot.id, review };
  });
}