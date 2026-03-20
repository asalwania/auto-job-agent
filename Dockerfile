# ── Stage 1: Dependencies ──────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ─────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js standalone build
RUN npm run build

# ── Stage 3: Runner (Next.js app) ─────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Install Playwright system deps + Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libcups2 libatspi2.0-0 libwayland-client0 \
    fonts-liberation fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy source for worker process (tsx runs from source)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Install Playwright browsers
RUN npx playwright install chromium

# Create storage directories
RUN mkdir -p storage/resumes storage/screenshots

EXPOSE 3000

CMD ["node", "server.js"]

# ── Stage 4: Worker process ────────────────────────────────────────
FROM node:20-slim AS worker

WORKDIR /app

ENV NODE_ENV=production

# Playwright system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libcups2 libatspi2.0-0 libwayland-client0 \
    fonts-liberation fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN npx playwright install chromium

RUN mkdir -p storage/resumes storage/screenshots

EXPOSE 3001

CMD ["npx", "tsx", "src/server/worker.ts"]
