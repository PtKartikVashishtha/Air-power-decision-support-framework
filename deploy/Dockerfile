# Multi-stage production build for 100% offline air-gapped deployment
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.9.0

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY benchmarks/ ./benchmarks/

RUN pnpm install --frozen-lockfile
RUN pnpm --recursive build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./

EXPOSE 3000 3001
CMD ["pnpm", "run", "dev"]
