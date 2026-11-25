# Changelog

Registro das alterações relevantes do backend. Toda mudança de rota, contrato,
permissão, banco, produção ou auditoria deve ser adicionada aqui.

## 2026-11-25

### Segurança e Hardening (OWASP — Rodadas P0 e P1)

- **Multi-tenancy e Autorização:**
  - `companies`: corrigido escopo de `company_admin` de filial para impedir gestão da Matriz ou filiais irmãs e troca de usuários entre empresas sem limpeza do vínculo anterior em `user_companies`.
  - `auth.middleware.ts`: validação de UUID em `x-company-id`, aplicação server-side da trava `passwordChangeRequired`, e bloqueio *fail-closed* (`403`) para usuários sem empresa ativa fora de rotas de conta/admin SaaS.
  - Repositórios (`clients`, `services`, `bundled`, `nf`, `movimentation`) e usecases: comportamento *fail-closed* quando `companyIds` está vazio/ausente, filtro `bundled.active = true` para `colaborator`, e validação de chaves estrangeiras (`movimentationId`, `nfId`, `destinationClientId`, `destinationUserId`) no escopo do tenant.
  - `clients`: removido acesso de escrita para `colaborator` e restringido `GET /clients` de `colaborator` apenas aos clientes de seus serviços em `bundled` ativos (com CPF mascarado).
  - `types`: mutações (`POST /types`, `PATCH /types/:id/deactivate`) restritas ao papel `administrator` com regex de allowlist no nome.
- **Arquivos, PDFs, E-mail, JWT e OTP:**
  - `NF` e `src/lib/archivePath.ts`: `POST /nf/sendemail` agora usa dados e `pathFile` autoritativos do banco dentro de `archives/` (bloqueando Path Traversal e exfiltração cross-tenant), com partição de novos uploads por `companyId`, verificação de `fs.realpath`, limites no `@fastify/multipart` (`10 MB`, `1` arquivo), validação de magic bytes `%PDF-`, limite de 20 páginas e timeout no `pdfjs-dist`.
  - `nodemailer.ts`: escape HTML em todos os templates, sanitização contra Header Injection, `requireTLS` para STARTTLS e propagação de erro em `sendEmailNf` sem vazar metadados SMTP na resposta HTTP.
  - `app.ts` e `jwt.ts`: validação fail-fast de `JWT_SECRET` em produção, algoritmo `HS256` fixado, error handler global sanitizado, limites HTTP/timeouts e auditoria corrigida para `GET /notes/:id/file`, `/admin/lgpd/*` e `/admin/company-requests`.
  - `adminData`: allowlist estrita de colunas graváveis por tabela e máscara de CPF na saída.
  - `emailVerificationCodes`: verificação e consumo atômicos em transação e cooldown de 60s entre envios (`429`).
- **Infraestrutura e Documentação:**
  - Criado `SECURITY.md` com padrões OWASP aplicáveis à stack e referência obrigatória em `CLAUDE.md` e `README.md`.
  - `Dockerfile` de produção passou a executar com usuário não-root `USER bun`; `compose.production.yaml` recebeu `no-new-privileges`, `cap_drop: ALL`, `mem_limit` e `pids_limit`; `.dockerignore` e `.gitignore` ampliados.
- **Revogação de JWT, Anti-Enumeração, Pool/Logs e Testes (Rodada 3):**
  - Adicionada coluna `token_version` (`drizzle/0019_user_token_version.sql`) com claim `tv` validada no `authMiddleware` e incrementada em toda troca/reset de senha (`PATCH /account/password` passa a retornar novo `token`).
  - Login com proteção contra timing oracle, checagem de `role.active` e limite de senha de `6..128` sem `.trim()`; `companies` com senha `8..128`; validação de OTP antes de checagens de conflito no onboarding público; correção do cálculo/limpeza em `checkCpf.ts`.
  - Transação atômica na aprovação/rejeição de solicitações de empresa, update único em `editService`, remoção de `id` opcional em `serviceCreateBaseSchema` e rate limit `sensitive` em `/account/password`, `/account/privacy/export` e `/account/privacy/anonymize`.
  - Removidos pacotes não usados/dev de `dependencies` em `package.json` (`@fastify/swagger*` carregado dinamicamente em dev), adicionados `connect_timeout`/`statement_timeout` no pool PostgreSQL, bloqueio de `demoSeed` em produção, redação Pino com wildcards, CORS/Helmet reforçados, expurgo de `security_incidents` (5 anos) em `retention.ts` e suíte `src/tests/security.test.ts` (`bun test`).

## 2026-11-01

### Produção e observabilidade

- Adicionado estágio de imagem Docker para produção.
- Adicionado `compose.production.yaml` com restart, healthcheck, banco privado e
  execução do build compilado.
- Adicionado suporte a `AXIOM_TOKEN`, `AXIOM_DATASET`, `LOG_LEVEL` e
  `AUDIT_LOG_ENABLED`.
- Adicionado log estruturado de auditoria para POST, PUT, PATCH e DELETE.
- Mantida a remoção de dados sensíveis dos logs.
- Adicionada troca obrigatória da senha inicial do administrador.
- Adicionada a rota autenticada `PATCH /account/password`.
- Login passou a retornar `passwordChangeRequired`.
- Adicionada a migration `0012_password_change_required.sql`.
- Credenciais do PostgreSQL passaram a ser obrigatórias via ambiente.

### Seed

- O seed passou a criar somente roles, administrador, status de serviço e tipos
  de NF essenciais.
- Removido o carregamento automático de dados demonstrativos.

### Administração

- Unificadas as operações administrativas em `/admin/data/:table`.
- Adicionados GET paginado, GET por ID, POST e PATCH para as tabelas permitidas.
- Acesso restrito exclusivamente ao papel `administrator`.

### NF, serviços e movimentações

- `movimentationId` tornou-se opcional na criação de NF.
- Adicionado filtro de serviços por `clientId`.
- Adicionadas rotas de tipos e movimentações com permissões específicas.

### Correções

- Corrigido o healthcheck do PostgreSQL para usar `POSTGRES_USER` e
  `POSTGRES_DB` configurados no ambiente, inclusive em produção.

## Como registrar uma nova alteração

Inclua uma entrada na data correspondente contendo:

- área afetada;
- rota ou tabela;
- comportamento anterior e novo;
- permissões;
- impacto para frontend e produção;
- migration ou variável de ambiente necessária.
