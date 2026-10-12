# One image build, three targets: api, web, renderer (compose.prod.yaml picks the target).
# ponytail: each target keeps the workspace's full node_modules; prune per app if image size ever matters.

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
# prisma generate (postinstall) only needs a well-formed URL; the real one comes at run time.
ENV DATABASE_URL=postgresql://build@localhost/build
RUN pnpm install --frozen-lockfile
# Next bakes both into the build: the /api rewrite target and the public VAPID key.
ARG API_URL=http://api:3001
ARG VAPID_PUBLIC_KEY=
RUN pnpm --filter @petty-tab/api build \
 && API_URL=$API_URL VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY pnpm --filter @petty-tab/web build

FROM build AS api
WORKDIR /app/apps/api
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]

FROM build AS web
WORKDIR /app/apps/web
CMD ["pnpm", "exec", "next", "start", "-p", "3000"]

FROM build AS renderer
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/* \
 && pnpm --filter @petty-tab/renderer exec playwright install --with-deps chromium
WORKDIR /app/apps/renderer
CMD ["node", "src/main.ts"]
