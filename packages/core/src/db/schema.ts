import { integer, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { BrowserName, BuildStatus, ReviewStatus, SnapshotStatus } from '../types';

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  apiKeyHash: text('api_key_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const builds = pgTable('builds', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  branch: text('branch').notNull().default('main'),
  commitSha: text('commit_sha'),
  prNumber: integer('pr_number'),
  status: text('status').$type<BuildStatus>().notNull().default('running'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const snapshots = pgTable('snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  buildId: uuid('build_id')
    .notNull()
    .references(() => builds.id, { onDelete: 'cascade' }),
  /** Denormalized for baseline lookups: latest approved snapshot per (project, key). */
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  /** Stable identity across builds: name + browser + viewport. */
  key: text('key').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  browser: text('browser').$type<BrowserName>().notNull().default('chromium'),
  viewportWidth: integer('viewport_width').notNull().default(1280),
  viewportHeight: integer('viewport_height').notNull().default(720),
  status: text('status').$type<SnapshotStatus>().notNull().default('pending'),
  review: text('review').$type<ReviewStatus>().notNull().default('pending'),
  screenshotKey: text('screenshot_key'),
  baselineKey: text('baseline_key'),
  diffKey: text('diff_key'),
  diffPercent: real('diff_percent'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});