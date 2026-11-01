FROM oven/bun:1 AS dependencies

WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS development

COPY . .

EXPOSE ${PORT:-3000}

CMD ["bun", "run", "dev"]

FROM dependencies AS builder

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE ${PORT:-3000}

CMD ["bun", "run", "dist/server.js"]