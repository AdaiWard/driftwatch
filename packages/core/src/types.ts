export type BrowserName = 'chromium' | 'firefox' | 'webkit';

export type BuildStatus = 'running' | 'passed' | 'failed';

/**
 * Lifecycle of a single screenshot inside a build:
 * pending -> new | changed | unchanged
 */
export type SnapshotStatus = 'pending' | 'new' | 'changed' | 'unchanged';

/** Human decision on a new/changed snapshot. `unchanged` is auto-approved. */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Viewport {
  width: number;
  height: number;
}

export interface CaptureSpec {
  /** Human-readable name, unique per build (combined with browser+viewport). */
  name: string;
  url: string;
  browser?: BrowserName;
  viewport?: Viewport;
  fullPage?: boolean;
  /** CSS selectors to cover with a neutral box (dates, avatars, anything random). */
  maskSelectors?: string[];
  /** Extra settle time after networkidle, ms. */
  delayMs?: number;
}

export interface CreateBuildPayload {
  branch?: string;
  commitSha?: string | null;
  prNumber?: number | null;
  captures: CaptureSpec[];
}

export interface CaptureJobData {
  buildId: string;
  projectId: string;
  capture: CaptureSpec;
}