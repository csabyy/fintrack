# syntax=docker/dockerfile:1

# ---- deps -------------------------------------------------------------------
FROM node:24-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM node:24-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The build never connects to the database; a placeholder URL is enough.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build

# ---- prisma cli -------------------------------------------------------------
# Standalone Prisma CLI (same version as the lockfile) with its own dependencies, for `prisma db push` on start
FROM node:24-bookworm-slim AS prisma-cli
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /prisma-cli
COPY package-lock.json /tmp/package-lock.json
RUN PRISMA_VERSION=$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version") \
  && node -e "require('fs').writeFileSync('package.json', JSON.stringify({ private: true, dependencies: { prisma: process.argv[1] }, allowScripts: { prisma: true, '@prisma/engines': true } }))" "$PRISMA_VERSION" \
  && npm install --no-audit --no-fund

# ---- run --------------------------------------------------------------------
FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

RUN groupadd --system --gid 1001 nodejs && useradd --system --create-home --uid 1001 --gid nodejs nextjs

# Next.js standalone server + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public/ (self-hosted fonts); standalone output does not include it
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma CLI with its dependencies (for `prisma db push` on start), then the schema and generated client
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma-cli/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
