# Backend PFM

API do sistema PFM, construída com Bun, Fastify, TypeScript, PostgreSQL e
Drizzle ORM.

## Autoria e projetos relacionados

Este backend é mantido por [Derik-Carv](https://github.com/Derik-Carv).

O frontend oficial do sistema está em
[Derik-Carv/frontend-pfm](https://github.com/Derik-Carv/frontend-pfm). O frontend
é de autoria de [Renan Miranda](https://github.com/renanbmiranda), com
autorização para integração, containerização e publicação neste projeto.

> Documentação completa para consulta no navegador:
> [`docs/index.html`](./docs/index.html)

## Visão geral

- Runtime: Bun
- API: Fastify 5
- Banco: PostgreSQL 16
- ORM e schema: Drizzle ORM
- Validação: Zod
- Documentação de contratos: Swagger/OpenAPI
- Logs: Pino, saída local formatada e Axiom em produção
- Auditoria: eventos de criação e alteração enviados ao logger/Axiom
- Upload de NF: multipart/form-data com PDF e JSON serializado

## Requisitos

- Git
- Bun
- Docker e Docker Compose

## Configuração

Copie o modelo e preencha os valores reais:

```bash
cp .env.example .env
```

Variáveis importantes:

```env
NODE_ENV=development
PORT=3336
HOST=0.0.0.0
DATABASE_URL=postgres://app_user:password@postgres:5432/backend
JWT_SECRET=change-me
ADMIN_DEFAULT_PASSWORD=change-me
CPFADMIN=00000000000
AXIOM_TOKEN=
AXIOM_DATASET=backend-pfm
AUDIT_LOG_ENABLED=true
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

`CPFADMIN` é um CPF fictício de desenvolvimento. A senha definida em
`ADMIN_DEFAULT_PASSWORD` é temporária: no primeiro login, o frontend deve
redirecionar o administrador para `PATCH /account/password`.

Nunca versionar `.env`, tokens, senhas ou chaves privadas.

## Desenvolvimento

```bash
bun install
bun run dc
```

O backend fica disponível em `http://localhost:3336` quando `PORT=3336`.

Recursos:

- Swagger UI: `http://localhost:3336/docs`
- OpenAPI JSON: `http://localhost:3336/docs/json`
- Health check: `http://localhost:3336/public/health`

## Produção

Use um `.env` de produção com credenciais fortes e um `AXIOM_TOKEN` configurado:

```bash
bun run dc:prod
```

O compose de produção:

- usa a imagem `production` sem hot reload;
- não monta o código-fonte como volume;
- não expõe o PostgreSQL publicamente;
- reinicia os serviços automaticamente;
- aplica o schema antes de iniciar a aplicação;
- verifica a saúde da API.

Comandos operacionais:

```bash
docker compose -f compose.yaml -f compose.production.yaml ps
docker compose -f compose.yaml -f compose.production.yaml logs -f backend
docker compose -f compose.yaml -f compose.production.yaml down
```

## Seed essencial

Ao iniciar, o backend cria somente dados necessários para o sistema funcionar:

- roles `administrator`, `manager`, `finance`, `observer` e `colaborator`;
- usuário administrador `administrator.system`;
- status `Fila`, `Em Andamento` e `Finalizado`;
- tipos de NF `Serviço Prestado` e `Aquisição de Material`.

Clientes, usuários adicionais, serviços, movimentações e NFs são criados pelas
rotas da aplicação. Dados demonstrativos não são carregados automaticamente.
O `docker compose` aplica o schema antes de iniciar o servidor.

Para apagar o banco local e recriar o seed:

```bash
bun run db-reset-and-seed
```

> Esse comando remove o volume PostgreSQL e todos os dados.

## Autenticação

Faça login:

```http
POST /public/login
Content-Type: application/json
```

```json
{
  "username": "administrator.system",
  "password": "SENHA_CONFIGURADA"
}
```

Use o token retornado:

```http
Authorization: Bearer SEU_TOKEN
```

Se a resposta do login retornar `passwordChangeRequired: true`, altere a senha
antes de liberar o restante da interface:

```http
PATCH /account/password
Content-Type: application/json
Authorization: Bearer SEU_TOKEN
```

```json
{
  "currentPassword": "senha-temporaria",
  "newPassword": "uma-senha-forte"
}
```

## Rotas principais

### Públicas

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/public/health` | Health check |
| POST | `/public/login` | Autenticação |
| POST | `/public/register` | Cadastro de colaborador |

### Clientes

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/clients?page=1&limit=10` | Clientes ativos paginados |
| POST | `/clients` | Criar cliente |
| PATCH | `/clients` | Editar cliente |

### Serviços

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/services/list?clientId=UUID` | Serviços ativos, opcionalmente filtrados por cliente |
| POST | `/services/create` | Criar serviço |
| PATCH | `/services/:id` | Editar serviço |

### NFs

| Método | Rota | Finalidade |
|---|---|---|
| POST | `/nf/` | Criar NF com PDF |
| GET | `/notes/?page=1&limit=20&status=active` | Listar NFs |
| PATCH | `/notes/:id/deactivate` | Desativar NF |

O `movimentationId` da NF é opcional.

### Tipos e movimentações

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/types` | Listar tipos |
| POST | `/types` | Criar tipo |
| PATCH | `/types/:id/deactivate` | Desativar tipo |
| GET | `/movimentations` | Listar movimentações |
| POST | `/movimentations` | Criar movimentação |
| PATCH | `/movimentations/:id/deactivate` | Desativar movimentação |

Tipos e movimentações exigem os papéis `administrator`, `manager` ou `finance`.

### Dashboard

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/home/services?page=1&limit=10` | Serviços disponíveis ao usuário |
| GET | `/home/services/index` | Resumo de serviços |
| GET | `/home/services/index/:type/:finder` | Busca paginada de serviços |

### Gestão

| Método | Rota | Permissão |
|---|---|---|
| GET | `/manager/services/status` | `administrator`, `manager` |
| POST | `/manager/services` | `administrator`, `manager` |
| GET | `/services/list` | `administrator`, `manager`, `finance` |
| POST | `/services/create` | `administrator`, `manager`, `finance` |
| PATCH | `/services/:id` | `administrator`, `manager`, `finance` |

### Administração

Todas exigem JWT e papel `administrator`.

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/admin/data/:table?page=1&limit=20&status=all` | Listar registros paginados |
| GET | `/admin/data/:table/:id` | Consultar registro |
| POST | `/admin/data/:table` | Criar registro |
| PATCH | `/admin/data/:table/:id` | Editar registro |

Tabelas administrativas:

```text
roles, users, clients, movimentations, types,
status-services, services, notes, bundled
```

`password`, tokens e credenciais nunca são retornados. `id`, `createdAt` e
`updatedAt` são controlados pelo backend.

### Permissões resumidas

| Área | Papéis |
|---|---|
| Clientes | `administrator`, `manager`, `finance`, `colaborator` |
| Serviços do menu | `administrator`, `manager`, `finance` |
| NF criação | `administrator`, `finance` |
| NF consulta/desativação | `administrator`, `manager`, `finance` |
| Tipos | `administrator`, `manager`, `finance` |
| Movimentações | `administrator`, `manager`, `finance` |
| Administração genérica | `administrator` |

## Upload de NF

Envie `multipart/form-data` com:

- `file`: PDF da nota;
- `nf`: JSON serializado.

```ts
const formData = new FormData();
formData.append("file", pdfFile);
formData.append("nf", JSON.stringify({
  typeId,
  numberNf: "123456",
  acessKey: "CHAVE_COM_44_OU_50_DIGITOS",
  thirdPartyClientId: clientId,
  emissionDate: "2026-11-01",
  totalValue: 5000,
  servicesId: serviceId
}));

await fetch("/nf/", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData
});
```

Não defina manualmente `Content-Type`; o cliente deve gerar o boundary do
multipart.

## Logs e auditoria

Em desenvolvimento, os logs são formatados no terminal. Em produção, são
enviados ao Axiom.

Ative auditoria:

```env
AUDIT_LOG_ENABLED=true
AXIOM_TOKEN=seu-token
AXIOM_DATASET=backend-pfm
```

São registrados eventos de `POST`, `PUT`, `PATCH` e `DELETE`, contendo ator,
papel, rota, método, status, sucesso e request ID. No Axiom, filtre por:

```text
audit:true
```

Senhas, CPF, tokens e Authorization são mascarados.

## Banco e migrations

```bash
bun run db:generate
bun run db:push
bun run db:studio
```

## Validação local

```bash
bun run typecheck
bun run build
git diff --check
```

## Política de documentação

Toda nova rota, alteração de contrato, regra de permissão, mudança de banco,
configuração de produção ou evento de auditoria deve atualizar:

1. o Swagger/OpenAPI da rota;
2. [`docs/index.html`](./docs/index.html);
3. este README quando alterar o uso público;
4. [`CHANGELOG.md`](./CHANGELOG.md), com a data e o impacto.

Consulte [`CHANGELOG.md`](./CHANGELOG.md) para o histórico.

## Licença

MIT.
