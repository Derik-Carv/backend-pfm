# Backend API

API backend em TypeScript com Fastify, Drizzle ORM e PostgreSQL, usando Bun como runtime principal.

## Requisitos

Antes de rodar o projeto, tenha instalado:

- Bun 1.x
- Git
- Docker e Docker Compose (opcional, mas recomendado para o PostgreSQL)

## 1) Instalar o Bun

### Windows

No PowerShell ou Git Bash:

```powershell
powershell -c "irm https://bun.sh/install.ps1 | iex"
```

Se preferir via winget:

```powershell
winget install Oven-sh.Bun
```

Feche e abra o terminal e valide:

```powershell
bun --version
```

### macOS

Com Homebrew:

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

Depois, reinicie o terminal ou rode:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Valide:

```bash
bun --version
```

## 2) Clonar o projeto

```bash
git clone <url-do-repositorio>
cd backend
```

## 3) Instalar dependências

No diretório do projeto:

```bash
bun install
```

## 4) Configurar variáveis de ambiente

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

Edite o arquivo `.env` com as configurações locais:

```env
PORT=3336
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgres://root:rootpassword@localhost:5432/dev_db
```

> Se estiver usando Docker Compose, normalmente o host para o banco em desenvolvimento é `localhost` no Windows, macOS e Linux. Caso o banco não conecte, teste `host.docker.internal` no ambiente Docker.

## 5) Subir o banco PostgreSQL

O projeto já inclui o arquivo `compose.yaml` com o serviço do PostgreSQL.

### Iniciar apenas o banco

```bash
docker compose up -d postgres
```

### Iniciar backend + banco

```bash
docker compose up --build
```

Para parar:

```bash
docker compose down
```

## 6) Rodar a aplicação

### Desenvolvimento

```bash
bun run dev
```

O projeto usa o Bun em modo watch, então ele recarrega automaticamente ao salvar arquivos.

### Produção local

```bash
bun run start
```

### Build da aplicação

```bash
bun run build
```

## 7) Acessar a API

Com o servidor rodando, a API fica disponível em:

- http://localhost:3336
- Swagger UI: http://localhost:3336/docs

## 8) Drizzle ORM

### Gerar migrations

```bash
bunx drizzle-kit generate --config=drizzle.config.ts
```

### Enviar schema para o banco

```bash
bunx drizzle-kit push --config=drizzle.config.ts
```

### Abrir Drizzle Studio

```bash
bunx drizzle-kit studio --config=drizzle.config.ts --host 0.0.0.0
```

## 9) Observações importantes

- Não commite o arquivo `.env`.
- Mantenha um `.env.example` com valores vazios ou exemplos públicos.
- Em ambientes reais, use variáveis sensíveis via secrets do ambiente / deploy provider.
- O projeto foi criado para rodar com Bun, então prefira os comandos `bun ...` em vez de `npm` ou `yarn`.

## 10) Comandos úteis

```bash
bun install
bun run dev
bun run build
bun run start
docker compose up -d postgres
docker compose down
```

## 11) Dicas por sistema operacional

### Windows

- Recomendado usar PowerShell ou WSL2 para desenvolvimento.
- Se o Docker não conseguir acessar o banco pelo `localhost`, tente `host.docker.internal`.

### macOS

- O processo mais simples é usar Homebrew para instalar Bun.
- Docker Desktop costuma funcionar bem com o PostgreSQL local.

### Linux

- O comando de instalação via curl geralmente funciona bem.
- Se o Bun não estiver no `PATH`, adicione `export PATH="$HOME/.bun/bin:$PATH"` ao seu perfil.

---

Este projeto foi configurado para uso com Bun e Fastify. Para mais detalhes, consulte o restante da estrutura e os arquivos de configuração do projeto.
