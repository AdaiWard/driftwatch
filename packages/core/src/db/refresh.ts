import { and, desc, eq } from 'drizzle-orm';
import type { Build, Db, Snapshot } from './client';
import { builds, snapshots } from './schema';
import { recomputeBuildStatus } from '../review';

/** Derives the build status from all of its snapshots and persists it. */
export async function refreshBuildStatus(db: Db, buildId: string): Promise<void> {
  const rows = await db
    .select({ status: snapshots.status, review: snapshots.review })
    .from(snapshots)
    .where(eq(snapshots.buildId, buildId));

  const status = recomputeBuildStatus(rows);
  const finishedAt = status === 'running' ? null : new Date();
  await db.update(builds).set({ status, finishedAt }).where(eq(builds.id, buildId));
}

/**
 * Baseline = the newest approved snapshot for the same capture key in
 * the project. First-ever captures have no baseline: they start as
 * status "new" and the reviewer promotes them with one approval.
 */
export async function latestBaseline(
  db: Db,
  projectId: string,
  key: string,
): Promise<Snapshot | undefined> {
  const rows = await db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.projectId, projectId), eq(snapshots.key, key), eq(snapshots.review, 'approved')))
    .orderBy(desc(snapshots.createdAt))
    .limit(1);
  return rows[0];
}

export type { Build, Db, Snapshot };