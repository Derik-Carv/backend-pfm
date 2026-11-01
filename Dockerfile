FROM oven/bun:1 AS base

WORKDIR /usr/src/app

COPY package.json bun.lock* ./
RUN bun install

FROM base AS development

COPY . .

EXPOSE ${PORT:-3000}

CMD ["bun", "run", "dev"]

FROM base AS production

COPY . .
RUN bun run build

ENV NODE_ENV=production
EXPOSE ${PORT:-3000}

CMD ["bun", "run", "preview"]