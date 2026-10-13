# Contributing to DriftWatch

Thanks for considering a contribution. DriftWatch is an early-stage project, so opening an issue before a large change helps keep work aligned.

## Development setup

You need Node.js 20 or newer, PostgreSQL, and Redis. The easiest complete environment is Docker Compose:

```sh
docker compose up --build
```

For local TypeScript development, copy `.env.example` to `.env`, install dependencies, start the infrastructure described in the README, and run the API and worker in separate terminals.

Before opening a pull request, run:

```sh
npm ci
npm run check
docker compose config --quiet
```

## Pull requests

- Keep changes focused and explain the user-facing behavior.
- Add tests for domain logic and bug fixes.
- Update the README or API examples when behavior changes.
- Never commit `.env`, API keys, database dumps, screenshots containing private data, or object-store contents.
- Use clear commit messages; Conventional Commits are welcome but not required.

By participating, you agree to follow the project code of conduct.
