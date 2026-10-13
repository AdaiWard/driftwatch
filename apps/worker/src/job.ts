import { and, eq } from 'drizzle-orm';
import { PNG } from 'pngjs';
import {
  comparePngs,
  latestBaseline,
  objectKeys,
  refreshBuildStatus,
  snapshotKeySpec,
  snapshots,
  type CaptureJobData,
} from '@driftwatch/core';
import { db } from './db';
import { store } from './store';
import { capturePage } from './capture';

export interface CaptureResult {
  status: 'new' | 'changed' | 'unchanged';
  diffPercent?: number;
}

export async function processCapture(job: {
  data: CaptureJobData;
}): Promise<CaptureResult> {
  const { buildId, projectId, capture } = job.data;

  const captureKey = snapshotKeySpec(
    capture.name,
    capture.browser ?? 'chromium',
    capture.viewport ?? { width: 1280, height: 720 },
  );

  const [snapshot] = await db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.buildId, buildId), eq(snapshots.key, captureKey)))
    .limit(1);
  if (!snapshot) {
    throw new Error(`snapshot row not found: build ${buildId}, key ${captureKey}`);
  }

  const keys = objectKeys(projectId, buildId, snapshot.key);

  const screenshot = await capturePage(capture);
  await store.put(keys.screenshot, screenshot);

  const baseline = await latestBaseline(db, projectId, snapshot.key);
  const hasBaselineImage =
    baseline?.screenshotKey != null && (await store.exists(baseline.screenshotKey));

  if (!hasBaselineImage) {
    await db
      .update(snapshots)
      .set({ status: 'new', screenshotKey: keys.screenshot })
      .where(eq(snapshots.id, snapshot.id));
    await refreshBuildStatus(db, buildId);
    return { status: 'new' };
  }

  const baselinePng = PNG.sync.read(await store.get(baseline.screenshotKey!));
  const currentPng = PNG.sync.read(screenshot);
  const outcome = comparePngs(baselinePng, currentPng);
  if (outcome.diffPng) {
    await store.put(keys.diff, PNG.sync.write(outcome.diffPng));
  }

  await db
    .update(snapshots)
    .set({
      status: outcome.kind,
      // trivially identical captures need no human review
      review: outcome.kind === 'unchanged' ? 'approved' : 'pending',
      reviewedAt: outcome.kind === 'unchanged' ? new Date() : null,
      screenshotKey: keys.screenshot,
      baselineKey: baseline.screenshotKey,
      diffKey: outcome.diffPng ? keys.diff : null,
      diffPercent: outcome.diffPercent,
    })
    .where(eq(snapshots.id, snapshot.id));
  await refreshBuildStatus(db, buildId);

  return { status: outcome.kind, diffPercent: outcome.diffPercent };
}