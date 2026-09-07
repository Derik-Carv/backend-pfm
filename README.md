# Backend API

API backend em TypeScript com Fastify, Drizzle ORM e PostgreSQL, usando Bun como runtime principal.

## Requisitos essenciais

Antes de rodar o projeto, você precisa ter instalado no computador:

- Git
- Node.js LTS (recomendado v20 ou superior)
- Bun
- Docker e Docker Compose
- Editor de código (VS Code recomendado)

> Importante: apesar do projeto usar Bun, o Node.js ainda é útil para ambiente geral, ferramentas e compatibilidade de alguns setups. Em muitos computadores, o Bun não substitui completamente o Node em tudo, então vale instalar ambos.

---

## 1) Instalar o Git

### Windows

Baixe e instale pelo site oficial:

https://git-scm.com/download/win

### macOS

```bash
xcode-select --install
```

Ou via Homebrew:

```bash
brew install git
```

### Linux

```bash
sudo apt update && sudo apt install git
```

Verifique:

```bash
git --version
```

---

## 2) Instalar o Node.js

### Windows

#### Opção 1: via nvm-windows

```powershell
winget install CoreyButler.NVMforWindows
```

Depois reinicie o terminal e rode:

```powershell
nvm install 20.17.0
nvm use 20.17.0
```

#### Opção 2: via instalador oficial

https://nodejs.org/

Selecione a versão LTS e instale.

Valide:

```powershell
node -v
npm -v
```

### macOS

Com Homebrew:

```bash
brew install node
```

Valide:

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

Ou use nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20
```

Valide:

```bash
node -v
npm -v
```

---

## 3) Instalar o Bun

### Windows

#### via PowerShell

```powershell
powershell -c "irm https://bun.sh/install.ps1 | iex"
```

#### via winget

```powershell
winget install Oven-sh.Bun
```

Valide:

```powershell
bun --version
```

### macOS

```bash
brew install oven-sh/bun/bun
```

Valide:

```bash
bun --version
```

### Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

Depois, no terminal atual ou em um novo terminal:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Valide:

```bash
bun --version
```

---

## 4) Instalar o Docker e Docker Compose

### Windows

Instale o Docker Desktop:

https://www.docker.com/products/docker-desktop/

Depois abra o Docker Desktop e confirme que o serviço está rodando.

### macOS

Instale o Docker Desktop:

https://www.docker.com/products/docker-desktop/

### Linux

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Valide:

```bash
docker --version
docker compose version
```

---

## 5) Clonar o projeto

```bash
git clone <url-do-repositorio>
cd backend
```

---

## 6) Instalar dependências do projeto

Na raiz do projeto:

```bash
bun install
```

Se por algum motivo o Bun falhar, use também o Node para garantir ambiente:

```bash
npm install
```

> Em geral, o projeto foi pensado para ser executado com Bun, mas o Node ainda pode ser útil para instalar e diagnosticar problemas.

---

## 7) Configurar o arquivo de ambiente

Crie o arquivo `.env` a partir do exemplo:

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

Depois edite o arquivo `.env`:

```env
PORT=3336
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgres://root:rootpassword@localhost:5432/dev_db
```

Se estiver usando PostgreSQL via Docker, normalmente o host será `localhost` nas máquinas locais. Caso o banco não conecte, tente:

```env
DATABASE_URL=postgres://root:rootpassword@host.docker.internal:5432/dev_db
```

---

## 8) Subir o banco PostgreSQL com Docker

O projeto já possui um `compose.yaml` com o PostgreSQL.

### Iniciar o banco

```bash
docker compose up -d postgres
```

### Iniciar backend e banco juntos

```bash
docker compose up --build
```

### Parar os containers

```bash
docker compose down
```

---

## 9) Rodar a aplicação

### Desenvolvimento

```bash
bun run dev
```

### Produção local

```bash
bun run start
```

### Build do projeto

```bash
bun run build
```

---

## 10) Acessar a API

Com o servidor rodando, acesse:

- http://localhost:3336
- Swagger UI: http://localhost:3336/docs

---

## 11) Trabalhar com Drizzle

### Gerar migrations

```bash
bunx drizzle-kit generate --config=drizzle.config.ts
```

### Enviar schema para o banco

```bash
bunx drizzle-kit push --config=drizzle.config.ts
```

### Abrir o Drizzle Studio

```bash
bunx drizzle-kit studio --config=drizzle.config.ts --host 0.0.0.0
```

---

## 12) Dicas por sistema operacional

### Windows

- Prefira usar PowerShell ou WSL2.
- Se o Docker e o banco não se conectarem, teste `host.docker.internal`.
- Reinicie o terminal após instalar Node/Bun para que os comandos fiquem no `PATH`.

### macOS

- Use Homebrew para instalar Node e Bun.
- Docker Desktop normalmente resolve bem a conexão com PostgreSQL local.

### Linux

- Use `curl` para instalar Bun e `apt` para instalar Node/Docker.
- Se o Bun não estiver no `PATH`, adicione no seu shell:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

---

## 13) Boas práticas

- Nunca commite o arquivo `.env`.
- Mantenha um `.env.example` com valores vazios ou apenas exemplos.
- Em produção, use secrets do ambiente ou variáveis do provedor de deploy.
- O projeto foi criado principalmente para rodar com Bun, então prefira usar `bun` nos comandos de desenvolvimento.

---

## 14) Comandos úteis

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

Este projeto foi configurado para uso com Bun, Fastify, Drizzle e PostgreSQL. Com todos os requisitos instalados, ele pode ser executado em qualquer sistema operacional compatível com esses softwares.
