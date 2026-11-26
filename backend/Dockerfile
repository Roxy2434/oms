# Build with toolchain; runtime retains only production deps, including migration/seed CLI.
FROM node:24.15.0-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build node node_modules/prisma/build/index.js generate \
 && DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build \
 && npm prune --omit=dev

FROM node:24.15.0-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/storage/demo /app/.next/cache && chown -R node:node /app/storage /app/.next/cache
USER node
EXPOSE 3001
CMD ["node", "docker/start.mjs"]
