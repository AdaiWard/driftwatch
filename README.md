# DriftWatch

Self-hosted visual regression testing for teams that want to keep screenshots, infrastructure, and costs under their control.

> **Project status: early MVP.** Screenshot capture, comparison, baseline approval, filesystem/S3 storage, and the HTTP API work. A review UI, CLI, and GitHub pull-request comments are planned but not implemented yet.

[Русская версия](README.ru.md)

## What it does

DriftWatch captures a page in Playwright, compares it pixel-by-pixel with the latest approved baseline, stores the current image and diff, and waits for a reviewer to approve or reject visual changes. An unchanged snapshot is approved automatically.

```text
CI / API client
      │ POST /builds
      ▼
 Fastify API ──► Redis / BullMQ ──► Playwright worker
      │                                  │
      │                                  ├─ capture deterministic PNG
      │                                  ├─ find latest approved baseline
      │                                  └─ pixelmatch → diff PNG + percentage
      ▼
PostgreSQL + filesystem or S3-compatible object storage
```

The repository is a TypeScript monorepo:

- `apps/api` — Fastify API for projects, builds, snapshot review, and image access.
- `apps/worker` — BullMQ worker that captures pages with Playwright and computes diffs.
- `packages/core` — shared domain types, Drizzle/PostgreSQL schema, diffing, and storage adapters.
- `demo-app` — a small page used by the smoke-test workflow.

## Quick start with Docker

Requirements: Docker with Compose. The first build downloads Chromium and can take a few minutes.

```sh
docker compose up --build
```

This starts PostgreSQL, Redis, MinIO, the API at `http://localhost:3000`, and the demo target at `http://localhost:8080`.

Create a project (the API key is returned only once):

```sh
curl -X POST http://localhost:3000/api/v1/projects \
  -H 'content-type: application/json' \
  -d '{"name":"my-app"}'
```

Submit a visual build using the returned key:

```sh
curl -X POST http://localhost:3000/api/v1/builds \
  -H 'content-type: application/json' \
  -H 'x-api-key: dw_REPLACE_ME' \
  -d '{"branch":"main","captures":[{"name":"home","url":"http://demo-app","maskSelectors":[".timestamp"]}]}'
```

Fetch the build with `GET /api/v1/builds/:id`, then approve its first snapshot to establish a baseline:

```sh
curl -X POST http://localhost:3000/api/v1/snapshots/SNAPSHOT_ID/review \
  -H 'content-type: application/json' \
  -H 'x-api-key: dw_REPLACE_ME' \
  -d '{"review":"approved"}'
```

Submit the same build again. It should finish as `unchanged` with a `0` diff. Change `demo-app/style.css` and submit another build to see a `changed` snapshot and diff image.

To remove the development stack and its volumes:

```sh
docker compose down -v
```

## Local development

Requirements: Node.js 20+, PostgreSQL, Redis, and Chromium installed through Playwright.

```sh
cp .env.example .env
npm ci
npm run install:browsers
npm run db:push --workspace @driftwatch/api
```

Run these processes in separate terminals:

```sh
npm run dev:api
npm run dev:worker
python3 -m http.server 8080 --directory demo-app
```

The optional `scripts/dev-infra.sh` helper targets Debian/Ubuntu with PostgreSQL 17 already installed. Docker Compose is the portable setup for macOS, Windows, and other Linux distributions.

Run repository checks with:

```sh
npm run check
docker compose config --quiet
```

## API overview

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/projects` | none | Create a project and return its API key once |
| `GET` | `/api/v1/whoami` | `x-api-key` | Resolve the current project |
| `POST` | `/api/v1/builds` | `x-api-key` | Queue one to fifty captures |
| `GET` | `/api/v1/builds` | `x-api-key` | List the latest twenty builds with counts |
| `GET` | `/api/v1/builds/:id` | `x-api-key` | Get snapshots and image URLs |
| `POST` | `/api/v1/snapshots/:id/review` | `x-api-key` | Approve or reject a snapshot |
| `GET` | `/healthz` | none | Process health check |

A capture supports `name`, `url`, `browser`, `viewport`, `fullPage`, `maskSelectors`, and `delayMs`. Its stable baseline identity is `name--browser--WIDTHxHEIGHT` inside one project.

## Capture stability

The worker fixes the timezone to UTC, locale to `en-US`, device scale factor to 1, and reduced motion mode. It disables screenshot animations, waits for `networkidle` and web fonts, supports an additional settle delay, and masks dynamic regions by CSS selector. Pixel comparison uses `pixelmatch` with a threshold of `0.1`.

## Security and production status

The included credentials are local-development defaults. The current MVP is designed for a trusted network and must not be exposed directly to the public internet. Project creation and filesystem image access are currently unauthenticated, and capture URLs can reach any address available to the worker. See [SECURITY.md](SECURITY.md) before deploying.

## Roadmap

- [x] API, capture worker, PNG diffs, baseline review, filesystem/S3 storage
- [x] Docker Compose development stack and core unit tests
- [ ] Web review UI with build list, comparison slider, and approve/reject actions
- [ ] CLI and GitHub pull-request status/comments
- [ ] Firefox/WebKit CI coverage and browser pooling
- [ ] Authentication/authorization hardening, rate limits, and worker egress controls
- [ ] Flake detection and configurable diff policies

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and run `npm run check` before opening a pull request. Security reports should follow [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
