# Changelog

Registro das alterações relevantes do backend. Toda mudança de rota, contrato,
permissão, banco, produção ou auditoria deve ser adicionada aqui.

## [0.14.0] - 2026-11-28

- **Contas Pessoais (CPF, `0021_personal_cpf_accounts.sql`):**
  - Suporte a contas pessoais (`account_type = 'personal'`) com criação atômica e liberação imediata após confirmação OTP no e-mail (`/public/company-requests`), preservando a fila de aprovação do Admin SaaS para contas empresariais (`business` / CNPJ).
  - Validação matemática Módulo-11 de CPF e CNPJ (`src/utils/checkCnpj.ts`, `cpfValidateNormal`) com anti-enumeração em `usecaseRequestCompanyCode` (validação antes das consultas ao banco), mascaramento LGPD de CPF (`maskTenantDocument`) em `/companies/*`, `/account/privacy/*` e `/admin/*`.
  - Isolamento estrito de contas PF: bloqueio `403` em `/nf/*`, `/notes/*`, `/movimentations/*`, `/companies/branches` e `/companies/users`; `isConsolidated` forçado para `false`; categorias financeiras pessoais padrão em `defaultCategories.ts` e lançamentos em `/finance/entries` sem obrigatoriedade de `clientId` (com suporte opcional a `counterpartyName`, mantendo `CLIENT_REQUIRED` para contas PJ).
  - Anonimização LGPD (`POST /account/privacy/anonymize`) estendida para anonimizar tenant pessoal e `company_registration_requests` (`ANON-%`), com incremento de `token_version`.

- **Códigos Automáticos e Preferência Manual (`0022_company_manual_finance_codes.sql`):**
  - Geração automática sequencial de códigos para Centros de Custo (`CC-01`, `CC-02`...) e Categorias Financeiras (por natureza e tipo de conta), com bloqueio `403 MANUAL_CODE_NOT_ENABLED` por padrão.
  - Adicionada preferência administrativa `allow_manual_finance_codes` (`PATCH /companies/me/settings` e atualização pelo Admin SaaS) para habilitar codificação manual em integrações externas.

- **Revisão de Segurança e Hardening — Contas Pessoais (CPF) e Códigos Financeiros Manuais/Automáticos:**
  - **Anti-enumeração (`companyRequests.usecase.ts`):** validação matemática de CPF/CNPJ movida para antes das consultas ao banco em `usecaseRequestCompanyCode`, eliminando divergência `200` vs `400` para e-mails cadastrados; tratamento de colisão concorrente PostgreSQL (`23505`) na auto-aprovação PF; remoção de `.trim()` e alinhamento `8..128` em `adminPassword` (`companyRequests.schemas.ts`) + limpeza de branches duplicados em `companyRequests.controller.ts`.
  - **LGPD & Privacidade (`account.privacy.ts`, `0021_personal_cpf_accounts.sql`, `system.usecase.ts`):** anonimização completa de `company_registration_requests` (com atualização de `company_reg_req_document_length_chk` para aceitar `ANON-%`), incremento de `token_version` ao anonimizar usuário e aplicação de `maskTenantDocument` nas filiais em `usecaseGetCascadeHierarchy`.
  - **Escopo PF e Integridade Financeira (`movimentation.route.ts`, `companies.controller.ts`, `finance.repository.ts`):** bloqueio de `/movimentations` para contas pessoais (`403`), remoção de bloco `403` morto em `GET /companies/branches` (retornando `200 []`), bloqueio de edição de `counterpartyName` após baixa parcial (`409 ENTRY_HAS_SETTLEMENTS`) e proteção contra overflow de banda (`CATEGORY_CODE_BAND_EXHAUSTED`) no gerador automático de categorias.
  - **Governança (`SECURITY.md`, `CLAUDE.md`, `personalAccount.test.ts`):** criada seção obrigatória pré-implementação em `SECURITY.md` documentando todas as regressões recorrentes e novas armadilhas (referenciada em `CLAUDE.md`) e adicionados testes de regressão em `src/tests/personalAccount.test.ts`.

## [0.13.3] - 2026-11-28

- **Versionamento SemVer e Rastreabilidade:**
  - Definida versão unificada `0.13.3` em `package.json` (`src/config/version.ts`), exposta em `/public/health` e no Swagger (`src/app.ts`), alinhada ao histórico completo de marcos (`0.1.0` a `0.13.2` + blindagem P1/P2/P3).

- **Blindagem P1, P2 e P3 pós-testes de estresse (`finance`, `public`, `account`, `lgpd`, `adminData`, `frontend-pfm`):**
  - **P1:** validado escopo intercompany ao mesmo `motherId` em `createEntries`; removida sobrescrita manual de `counterpartyName`/`counterpartyDocument` em `PATCH /finance/entries/:id`, bloqueada troca de `clientId` após baixa parcial e exigido cliente ativo e não anonimizado; protegidos `kind`/`dreGroup`/`parentId` em categorias `isSystem` e adicionada detecção de ciclos em `parentId`; adicionada validação real de calendário UTC em `isoDateSchema` + `diffDaysIso` + faixa de datas no CSV; habilitado `allowNegative` para saldo inicial negativo em `createAccount`.
  - **P2:** erros de aritmética financeira convertidos para `400`; colisão de `Idempotency-Key` entre endpoints e concorrência `23505` tratados como `409` / replay seguro no repositório e com chave estável para retries em `frontend-pfm/src/FinancePanel.tsx`; validada correspondência Serviço ↔ NF ↔ Cliente em `/finance/entries` e `/from-service/:serviceId`; eliminados oráculos de enumeração (`409`/`429`) em `POST /public/company-requests/request-code` e `POST /public/password/forgot`.
  - **P3:** adicionados `Cache-Control: private, no-store` e `rateLimitProfiles.sensitive` em `GET /finance/reports/export` (e `Cache-Control: private, no-store` em `/account/privacy/*`), limpeza automática de `financial_idempotency_keys` (> 30 dias) em `retention.ts` (`deletedExpiredIdempotencyKeys` em `/admin/lgpd/cleanup` e `frontend-pfm/src/services/privacy.ts`), e retorno `400 EMPTY_ADMIN_PAYLOAD` em `/admin/data/:table` sem campos graváveis.
  - Adicionados testes de regressão P1, P2 e P3 em `src/tests/finance.test.ts` e atualizado `SECURITY.md`.

## [0.12.0] - 2026-11-26

- **Módulo Financeiro — Fase 1 (`0020_financial_module_phase1.sql`, `/finance/*`, `MODULO_FINANCEIRO.md`, `MODULO_CONTABILIDADE.md`):**
  - Documentação normativa e arquitetural adicionada em `MODULO_FINANCEIRO.md` e `MODULO_CONTABILIDADE.md`.
  - Migration idempotente `drizzle/0020_financial_module_phase1.sql` criando `financial_accounts`, `financial_categories`, `cost_centers`, `financial_entries`, `financial_settlements` (*append-only*) e `financial_idempotency_keys` com valores em centavos `bigint` e constraints de integridade.
  - Utilitários de aritmética exata (`src/lib/finance/money.ts`), CSV anti-formula injection (`src/lib/finance/csv.ts`), idempotência (`src/lib/finance/idempotency.ts`) e seed padrão PME/SaaS (`src/lib/finance/defaultCategories.ts`, integrado a `src/database/seed.ts`).
  - Novas rotas em `/finance/*` (`accounts`, `categories`, `cost-centers`, `entries`, `entries/from-service/:serviceId`, `entries/:id/settle`, `settlements/:id/reverse`, `reports/cashflow`, `reports/aging`, `reports/export`) com RBAC restrito (`colaborator` bloqueado em 403), locks `SELECT ... FOR UPDATE`, `Idempotency-Key` (liberado também no CORS em `src/policies/cors.ts`) e auditoria LGPD para exportação CSV em `src/app.ts`.
  - Campos bancários/PIX/segredos adicionados ao `redact` do Pino em `src/config/logger.ts`; suíte de testes unitários e de integração adicionada em `src/tests/finance.test.ts`.

- **Correções pontuais pós-revisão de segurança (`logger.ts`, `infra/`, `seed.ts`, `adminLgpd.route.ts`, `SECURITY.md`):**
  - `src/config/logger.ts`: substituída trava booleana por `inFlightFlush` em `createAxiomLoggerStream` (evitando busy-loop em `flush()` durante shutdown) e adicionada validação `resolveSafeAxiomUrl` exigindo `https://` em produção para `AXIOM_URL`, com novos testes em `src/tests/infra.test.ts`.
  - `infra/deploy-off-vm.sh`: substituído IP público real da VM pelo placeholder `ubuntu@seu-servidor.exemplo`.
  - `infra/nginx-backend-pfm.conf`: adicionados `limit_req_zone`/`limit_conn_zone` (com limite mais estrito em `/public/(login|password|company-requests)`) e `proxy_set_header X-Forwarded-For $remote_addr;`.
  - `src/router/private/admin/lgpd/adminLgpd.route.ts`: adicionado `deletedExpiredIncidents` em `cleanupResponseSchema` para manter o retorno completo de `POST /admin/lgpd/cleanup`.
  - `src/database/seed.ts`: `startSeed()` agora verifica se `administrator.system` já existe antes de exigir `ADMIN_DEFAULT_PASSWORD` e `CPFADMIN`, bloqueia senha placeholder em produção e envolve a criação em `db.transaction`.
  - `SECURITY.md`: seção 13 adicionada com padrões OWASP/fiscais para módulos financeiros e contábeis futuros e checklist das correções pontuais atualizado.

## [0.11.0] - 2026-11-25

- **Tooling VPS/Edge, Limpeza e Testes (`infra/`, `package.json`, `compose.production.yaml`, `src/tests/infra.test.ts`):**
  - Removido pacote `@axiomhq/pino` não mais utilizado em `package.json`/`bun.lock`; `BACKEND_IMAGE` parametrizável adicionado em `compose.production.yaml` e `infra` excluído de `.dockerignore`.
  - Adicionados `infra/vps-tune-oci-micro.sh` (swap/ZRAM, `sysctl`, rotação Docker e cron semanal), `infra/nginx-backend-pfm.conf` (proxy reverso com keepalive, streaming de PDF e bloqueio de bots na borda) e `infra/deploy-off-vm.sh` (build local + deploy via SSH sem build na VPS).
  - Adicionada suíte `src/tests/infra.test.ts` cobrindo stream nativo Axiom (batching, cap de 500 eventos, tolerância a falhas) e resolução de `pdf.worker*.mjs`; documentação sincronizada em `SECURITY.md` e `README.md`.

### Infraestrutura, Docker e Performance (Oracle Cloud Micro / 1 GB RAM)

- **Imagem Docker enxuta (`Dockerfile`, `.dockerignore`, `package.json`):**
  - Migrado base para `oven/bun:1-alpine`, build com `--minify`, cache mount do BuildKit e cópia apenas de `dist/server.js` e `dist/pdf.worker.min.mjs` no estágio `production` (sem `node_modules` nem `chown` duplicando camadas).
  - Ampliado `.dockerignore` para excluir metadados de migrations, testes, docs, PDFs/planilhas e arquivos de compose/Docker do contexto de build.
- **Produção Compose e Tuning PostgreSQL (`compose.production.yaml`):**
  - Adicionados limites ajustados para `VM.Standard.E2.1.Micro` (1 GB RAM): `postgres` (`mem_limit: 256m`, `shared_buffers=64MB`, `max_connections=30`, `effective_cache_size=192MB`, `work_mem=2MB`) e `backend` (`mem_limit: 384m`, `read_only: true`, `tmpfs: /tmp`, `stop_grace_period: 15s`, rotação `json-file` 10MBx3).
  - Healthcheck em produção otimizado com `wget` a cada `60s`.
- **Runtime, Logs e PDF (`src/config/logger.ts`, `src/server.ts`, `src/database/index.ts`, `createNf.pdf.ts`, `getNfFile.controller.ts`):**
  - Substituído worker thread `@axiomhq/pino` por stream Pino nativo com buffer limitado (500 eventos, flush em lote via `fetch`) e `flushLogger()`.
  - Adicionado graceful shutdown (`SIGTERM`/`SIGINT`) encerrando Fastify, pool PostgreSQL (`closeDatabase`) e logs; pool configurável via `DB_POOL_MAX` (padrão `8`, `idle_timeout: 20`, `max_lifetime: 1800`).
  - `validateNfPdf` resolve `dist/pdf.worker.min.mjs` com fallback para `node_modules` e define `disableFontFace: true`; `getNfFileController` usa streaming (`createReadStream`) em vez de carregar PDFs inteiros em memória.
  - Novas variáveis opcionais documentadas em `.env.example`: `DB_POOL_MAX` e `AXIOM_URL`.

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

## [0.5.0] - 2026-11-01

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

## Histórico de Marcos (`0.1.0` – `0.13.2`)

| Versão | Marco |
| --- | --- |
| `0.1.0` | Base da API (`Bun`, `Fastify`, `Drizzle`, `Zod`, `JWT`, `Helmet`, `Rate Limit`, `Users/Roles`, `Seed`, `Axiom`) |
| `0.2.0` | Domínio de Clientes, Serviços, Status, vínculo `bundled` (colaborador) e Dashboard Home |
| `0.3.0` | Menu de Serviços/Clientes, edição, paginação global e injeção de dependências |
| `0.4.0` | Notas Fiscais (criação, anexo, desativação lógica), Tipos e Movimentações |
| `0.5.0` | Primeiro lançamento em produção integrado ao frontend (`01/11/2026`) |
| `0.6.0` | Validação de PDF de NF com `pdfjs-dist`, preview, reanexo e reativação |
| `0.7.0` | Envio de Notas Fiscais por e-mail com anexo PDF (`Nodemailer`) |
| `0.8.0` | Evolução BI no frontend (filtros cruzados, drill-down e Master-Detail) |
| `0.9.0` | Multi-Tenant hierárquico (Matriz/Filiais), onboarding OTP e recuperação de senha |
| `0.10.0` | Conformidade LGPD completa (ANPD Res. 15/18/19, auditoria, DPO) e rebranding para PFM |
| `0.11.0` | Hardening OWASP (`token_version`, guards tenant/PDF, CSP, container não-root) |
| `0.12.0` | Módulo Financeiro — Fase 1 (`0020_financial_module_phase1.sql`) e infra VPS 1 GB |
| `0.13.0` – `0.13.2` | Apresentação Pública & Demonstrativo Interativo (`frontend-pfm`) |

## Como registrar uma nova alteração

Inclua uma entrada na data correspondente contendo:

- área afetada;
- rota ou tabela;
- comportamento anterior e novo;
- permissões;
- impacto para frontend e produção;
- migration ou variável de ambiente necessária.
