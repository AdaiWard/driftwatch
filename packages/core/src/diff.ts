import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const DIFF_THRESHOLD = 0.1;

export interface DiffOutcome {
  kind: 'changed' | 'unchanged';
  /** Share of differing pixels, 0..1. Size mismatch is reported as 1. */
  diffPercent: number;
  /** Highlighted diff image, or null when sizes differ. */
  diffPng: PNG | null;
}

/**
 * pixelmatch expects Uint8ClampedArray; pngjs gives us Uint8Array. The runtime
 * only indexes into the buffers, so a view cast (no copy) is safe.
 */
function asClamped(data: Uint8Array): Uint8ClampedArray {
  return data as unknown as Uint8ClampedArray;
}

export function comparePngs(baseline: PNG, current: PNG): DiffOutcome {
  if (baseline.width !== current.width || baseline.height !== current.height) {
    return { kind: 'changed', diffPercent: 1, diffPng: null };
  }

  const diffPng = new PNG({ width: current.width, height: current.height });
  const changed = pixelmatch(
    asClamped(baseline.data),
    asClamped(current.data),
    asClamped(diffPng.data),
    current.width,
    current.height,
    { threshold: DIFF_THRESHOLD },
  );
  const diffPercent = changed / (current.width * current.height);

  return { kind: diffPercent === 0 ? 'unchanged' : 'changed', diffPercent, diffPng };
}