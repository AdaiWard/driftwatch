/**
 * Snapshot is considered resolved when it has a capture result and,
 * for anything that is not trivially unchanged, a human review.
 */
export interface SnapshotReviewRow {
  status: import('./types').SnapshotStatus;
  review: import('./types').ReviewStatus;
}

export function recomputeBuildStatus(snapshots: SnapshotReviewRow[]): import('./types').BuildStatus {
  if (snapshots.length === 0) {
    return 'failed';
  }
  const resolved = snapshots.every(
    (s) => s.status !== 'pending' && (s.status === 'unchanged' || s.review !== 'pending'),
  );
  if (!resolved) {
    return 'running';
  }
  return snapshots.some((s) => s.review === 'rejected') ? 'failed' : 'passed';
}