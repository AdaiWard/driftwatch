import type { BrowserName, Viewport } from './types';

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug.length > 0 ? slug : 'snapshot';
}

/** Stable identity of a snapshot across builds: name + browser + viewport. */
export function snapshotKeySpec(name: string, browser: BrowserName, viewport: Viewport): string {
  return `${slugify(name)}--${browser}--${viewport.width}x${viewport.height}`;
}

export function objectKeys(
  projectId: string,
  buildId: string,
  key: string,
): { screenshot: string; diff: string } {
  const prefix = `projects/${projectId}/builds/${buildId}`;
  return {
    screenshot: `${prefix}/${key}.png`,
    diff: `${prefix}/${key}--diff.png`,
  };
}