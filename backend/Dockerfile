# OMS app image: build once, then docker/start.mjs migrates, seeds an empty DB and serves on port 3001.
FROM node:24.15.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# prisma.config.ts requires DATABASE_URL to exist; generate/build never connect, so a placeholder is enough here.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
 && DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build
EXPOSE 3001
CMD ["node", "docker/start.mjs"]
