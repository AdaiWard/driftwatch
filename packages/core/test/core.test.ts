import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PNG } from 'pngjs';
import {
  comparePngs,
  loadConfig,
  objectKeys,
  recomputeBuildStatus,
  redisConnectionOptions,
  slugify,
  snapshotKeySpec,
} from '../src/index';

function solidPng(red: number): PNG {
  const png = new PNG({ width: 2, height: 2 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red;
    png.data[offset + 1] = 0;
    png.data[offset + 2] = 0;
    png.data[offset + 3] = 255;
  }
  return png;
}

describe('snapshot identity', () => {
  it('normalizes names and includes browser and viewport', () => {
    assert.equal(slugify(' Checkout / Mobile '), 'checkout-mobile');
    assert.equal(snapshotKeySpec('Checkout', 'chromium', { width: 1280, height: 720 }), 'checkout--chromium--1280x720');
  });

  it('keeps object keys scoped to a project and build', () => {
    assert.deepEqual(objectKeys('project', 'build', 'home'), {
      screenshot: 'projects/project/builds/build/home.png',
      diff: 'projects/project/builds/build/home--diff.png',
    });
  });
});

describe('image comparison', () => {
  it('recognizes identical and changed PNGs', () => {
    const baseline = solidPng(0);
    assert.deepEqual(comparePngs(baseline, solidPng(0)).kind, 'unchanged');

    const changed = comparePngs(baseline, solidPng(255));
    assert.equal(changed.kind, 'changed');
    assert.equal(changed.diffPercent, 1);
    assert.ok(changed.diffPng);
  });

  it('treats a size change as a complete diff', () => {
    const result = comparePngs(solidPng(0), new PNG({ width: 1, height: 1 }));
    assert.deepEqual(result, { kind: 'changed', diffPercent: 1, diffPng: null });
  });
});

describe('build review status', () => {
  it('stays running while review is pending', () => {
    assert.equal(recomputeBuildStatus([{ status: 'changed', review: 'pending' }]), 'running');
  });

  it('passes approved snapshots and fails rejected ones', () => {
    assert.equal(recomputeBuildStatus([{ status: 'new', review: 'approved' }]), 'passed');
    assert.equal(recomputeBuildStatus([{ status: 'changed', review: 'rejected' }]), 'failed');
  });
});

describe('configuration helpers', () => {
  it('parses Redis credentials and defaults', () => {
    assert.deepEqual(redisConnectionOptions('redis://:secret@redis.example:6380'), {
      host: 'redis.example',
      port: 6380,
      password: 'secret',
    });
    assert.equal(loadConfig({}).PORT, 3000);
  });
});
