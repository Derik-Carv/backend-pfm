# Backend API

TypeScript backend API built with Fastify, Drizzle ORM, and PostgreSQL, using Bun as the main runtime.

## Essential requirements

Before running the project, you need to have the following installed on your machine:

- Git
- Node.js LTS (recommended v20 or higher)
- Bun
- Docker and Docker Compose
- Code editor (VS Code recommended)

> Important: even though the project uses Bun, Node.js is still useful for the general environment, tools, and compatibility with some setups. On many machines, Bun does not completely replace Node in every scenario, so installing both is recommended.

---

## 1) Install Git

### Windows

Download and install from the official site:

https://git-scm.com/download/win

### macOS

```bash
xcode-select --install
```

Or with Homebrew:

```bash
brew install git
```

### Linux

```bash
sudo apt update && sudo apt install git
```

Verify:

```bash
git --version
```

---

## 2) Install Node.js

### Windows

#### Option 1: via nvm-windows

```powershell
winget install CoreyButler.NVMforWindows
```

Then restart the terminal and run:

```powershell
nvm install 20.17.0
nvm use 20.17.0
```

#### Option 2: via the official installer

https://nodejs.org/

Select the LTS version and install it.

Verify:

```powershell
node -v
npm -v
```

### macOS

With Homebrew:

```bash
brew install node
```

Verify:

```bash
node -v
npm -v
```

### Linux

#### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y nodejs npm
```

Or use nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
```

Verify:

```bash
node -v
npm -v
```

---

## 3) Install Bun

### Windows

#### via PowerShell

```powershell
powershell -c "irm https://bun.sh/install.ps1 | iex"
```

#### via winget

```powershell
winget install Oven-sh.Bun
```

Verify:

```powershell
bun --version
```

### macOS

```bash
brew install oven-sh/bun/bun
```

Verify:

```bash
bun --version
```

### Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

Then, in the current terminal or a new one:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Verify:

```bash
bun --version
```

---

## 4) Install Docker and Docker Compose

### Windows

Install Docker Desktop:

https://www.docker.com/products/docker-desktop/

Then open Docker Desktop and confirm the service is running.

### macOS

Install Docker Desktop:

https://www.docker.com/products/docker-desktop/

### Linux

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Verify:

```bash
docker --version
docker compose version
```

---

## 5) Clone the project

```bash
git clone <repository-url>
cd backend
```

---

## 6) Install project dependencies

At the project root:

```bash
bun install
```

If Bun fails for any reason, you can also use Node to set up the environment:

```bash
npm install
```

> In general, the project is designed to run with Bun, but Node can still be useful for installation and troubleshooting.

---

## 7) Configure the environment file

Create the `.env` file from the example:

### Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

### Windows (Git Bash / Bash)

```bash
cp .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Then edit the `.env` file:

```env
PORT=3336
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgres://root:rootpassword@localhost:5432/dev_db
```

If you are using PostgreSQL through Docker, the host is usually `localhost` on local machines. If the database does not connect, try:

```env
DATABASE_URL=postgres://root:rootpassword@host.docker.internal:5432/dev_db
```

---

## 8) Start the PostgreSQL database with Docker

The project already includes a `compose.yaml` with PostgreSQL.

### Start the database

```bash
docker compose up -d postgres
```

### Start backend and database together

```bash
docker compose up --build
```

### Stop the containers

```bash
docker compose down
```

---

## 9) Run the application

### Development

```bash
bun run dev
```

### Local production

```bash
bun run start
```

### Build the project

```bash
bun run build
```

---

## 10) Access the API

When the server is running, access:

- http://localhost:3336
- Swagger UI: http://localhost:3336/docs

---

## 11) Work with Drizzle

### Generate migrations

```bash
bunx drizzle-kit generate --config=drizzle.config.ts
```

### Push schema to the database

```bash
bunx drizzle-kit push --config=drizzle.config.ts
```

### Open Drizzle Studio

```bash
bunx drizzle-kit studio --config=drizzle.config.ts --host 0.0.0.0
```

---

## 12) Tips by operating system

### Windows

- Prefer PowerShell or WSL2.
- If Docker and the database do not connect, test `host.docker.internal`.
- Restart the terminal after installing Node/Bun so the commands are available in `PATH`.

### macOS

- Use Homebrew to install Node and Bun.
- Docker Desktop usually handles PostgreSQL local connections well.

### Linux

- Use `curl` to install Bun and `apt` to install Node/Docker.
- If Bun is not in `PATH`, add this to your shell:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

---

## 13) Best practices

- Never commit the `.env` file.
- Keep a `.env.example` with empty or sample values only.
- In production, use environment secrets or deployment provider variables.
- The project was mainly created to run with Bun, so prefer using `bun` for development commands.

---

## 14) Useful commands

```bash
git --version
node -v
npm -v
bun --version
docker --version
docker compose version
bun install
bun run dev
bun run build
bun run start
docker compose up -d postgres
docker compose down
```

---

This project was configured for use with Bun, Fastify, Drizzle, and PostgreSQL. With all requirements installed, it can run on any operating system compatible with these tools.
