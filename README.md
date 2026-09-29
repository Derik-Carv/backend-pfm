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
- Zod (Validation)

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
# Configurações do Servidor
PORT=3336
HOST=0.0.0.0

# Ambiente
NODE_ENV=development

# CORS
CORS_ORIGIN="localhost"

# Credenciais / Banco de Dados (Exemplo)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret

# Create role and admin user
ADMIN_DEFAULT_PASSWORD=Admin@123456
CPFADMIN="167.030.850-21"

DATABASE_URL="postgres://root:password@postgres:5432/user_db"

JWT_SECRET="your_secret_here"

# Betterstack token
LOGTOKEN=seu_token_copiado_aqui
```

Then replace the empty values with your local credentials when needed. Keep the structure consistent with the repository example and do not commit the real `.env` file.

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

### Build and Run for production
```bash
bun run build
bun run start
```

## Project Structure & Architecture

The project follows a layered architectural pattern separating concerns into Routes, Controllers, UseCases, and Repositories.

- **`src/router`**: Defines API endpoints, validation schemas (Zod), and OpenAPI options.
- **`src/controllers`** (or within routers): Handles HTTP requests, responses, and maps status codes.
- **`src/usecases`**: Contains the core business logic.
- **`src/database/tables`**: Repository layer that interacts with the Drizzle ORM.
- **`src/middlewares`**: Contains Auth and Role verification logic.

## Available Routes & Swagger Documentation

The API uses Fastify Swagger and exposes OpenAPI docs automatically.
The docs are available at `http://localhost:3336/docs`.

### Public Routes (`/public`)
- `POST /public/login`: User authentication.
- `POST /public/register`: User registration.
- `GET /public/health`: Application health check.

### Admin Routes (`/admin`) - Protected
*Requires JWT and Administrator Role*
- `GET /admin/users`: List users.
- `POST /admin/roles`: Create a new role.
- `GET /admin/roles`: List available roles.

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

## Notes

- Do not commit the `.env` file.
- Keep a `.env.example` with safe sample values only.
- For production, use environment variables or secret managers instead of hardcoded credentials.

## License

This project is licensed under the MIT License.
