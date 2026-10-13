FROM node:22-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/api apps/api

EXPOSE 3000
CMD ["sh", "-c", "npx drizzle-kit push --config apps/api/drizzle.config.ts && npx tsx apps/api/src/server.ts"]
