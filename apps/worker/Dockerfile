FROM node:22-slim
WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/worker apps/worker

# system deps for chromium + the browser itself
RUN npx playwright install --with-deps chromium

CMD ["npx", "tsx", "apps/worker/src/index.ts"]
