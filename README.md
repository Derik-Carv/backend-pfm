# Backend API

A Fastify-based backend written in TypeScript, using Bun as the runtime, PostgreSQL as the database, and Drizzle ORM for schema management.

## Tech Stack

- Bun
- Fastify
- TypeScript
- PostgreSQL
- Drizzle ORM
- Docker Compose
- Swagger / OpenAPI

## Requirements

Before starting, make sure you have installed:

- Git
- Node.js LTS (v20+ recommended)
- Bun
- Docker Desktop or Docker Engine + Compose

## Quick Start

```bash
git clone <repository-url>
cd backend
bun install
cp .env.example .env
bun run dc
```

Then open:

- http://localhost:3336
- http://localhost:3336/docs
- http://localhost:3336/docs/json

## Environment Configuration

Create a `.env` file by copying the project example exactly:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=

DATABASE_URL="postgres://root:password@postgres:5432/user_db"
JWT_SECRET="seu_secret_super_seguro_e_longo_aqui"
```

Then replace the empty values with your local credentials when needed. Keep the structure consistent with the repository example and do not commit the real `.env` file.

## Installing the Tools

### Windows

Install Git:

```powershell
git --version
```

Install Node.js LTS:

```powershell
winget install OpenJS.NodeJS.LTS
```

Install Bun:

```powershell
powershell -c "irm https://bun.sh/install.ps1 | iex"
```

Install Docker Desktop:

https://www.docker.com/products/docker-desktop/

### macOS

```bash
brew install git node bun
```

Then verify:

```bash
git --version
node -v
bun --version
```

### Linux

```bash
sudo apt update
sudo apt install -y git nodejs npm
curl -fsSL https://bun.sh/install | bash
```

Add Bun to PATH if needed:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

## Running the Project

### Start the full stack with Docker

```bash
bun run dc
```

This starts:

- PostgreSQL database
- Backend service
- Swagger UI

### Run only the backend in development mode

```bash
bun run dev
```

### Run the built version locally

```bash
bun run start
```

### Build for production

```bash
bun run build
```

## Swagger Documentation

The API uses Fastify Swagger and exposes OpenAPI docs automatically.

Available routes:

- `POST /public/login`
- `GET /public/health`

The docs are available at:

- http://localhost:3336/docs
- http://localhost:3336/docs/json

## Drizzle Commands

Generate migrations:

```bash
bunx drizzle-kit generate --config=drizzle.config.ts
```

Push the schema to the database:

```bash
bunx drizzle-kit push --config=drizzle.config.ts
```

Open Drizzle Studio:

```bash
bunx drizzle-kit studio --config=drizzle.config.ts --host 0.0.0.0
```

## Useful Commands

```bash
git --version
node -v
bun --version
docker --version
docker compose version
bun install
bun run dev
bun run build
bun run start
bun run dc
docker compose down
```

## Notes

- Do not commit the `.env` file.
- Keep a `.env.example` with safe sample values only.
- For production, use environment variables or secret managers instead of hardcoded credentials.

## License

This project is licensed under the MIT License.
