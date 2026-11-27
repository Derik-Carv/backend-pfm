# syntax=docker/dockerfile:1.7

FROM oven/bun:1-alpine AS dependencies

WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN --mount=type=cache,id=bun-cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM dependencies AS development

COPY . .

ARG PORT=3000
EXPOSE ${PORT}

CMD ["bun", "run", "dev"]

FROM dependencies AS builder

ENV NODE_ENV=production
COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder --chown=bun:bun /usr/src/app/dist ./dist

RUN mkdir -p /usr/src/app/archives && chown bun:bun /usr/src/app/archives

USER bun

ARG PORT=3000
EXPOSE ${PORT}

STOPSIGNAL SIGTERM

CMD ["bun", "run", "dist/server.js"]
