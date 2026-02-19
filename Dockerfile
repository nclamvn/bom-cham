# Bờm Chăm — Eldercare AI Platform
FROM node:22-bookworm

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:build

ENV NODE_ENV=production

USER node

CMD ["node", "dist/index.js", "gateway", "--bind", "lan", "--port", "18789"]
