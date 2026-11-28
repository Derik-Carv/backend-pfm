# Guia de Segurança do Projeto — Padrões OWASP Aplicados à Stack

> **CONSULTA OBRIGATÓRIA:**
> Este documento (`SECURITY.md`) é referência permanente de segurança do **Backend PFM** e **deve ser consultado antes de implementar ou alterar** qualquer rota, schema Zod, middleware, repositório Drizzle, upload de arquivo, envio de e-mail, integração externa, variável de ambiente ou configuração de deploy/Docker.
>
> Base oficial: [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/index.html) | Última revisão: `2026-11-26`.

---

## Stack Coberta por Este Guia

- **Runtime e Linguagem:** Bun 1.x + TypeScript 5.9 (`strict`).
- **Framework HTTP e Contratos:** Fastify v5 + Zod 4 (`fastify-type-provider-zod`) + Swagger/OpenAPI (carregado dinamicamente apenas em desenvolvimento).
- **Banco de Dados e ORM:** PostgreSQL 16+ + Drizzle ORM (`postgres.js`).
- **Autenticação e Sessão:** `@fastify/jwt` (HS256, 30 min, revogação via `token_version`) + Argon2id (`Bun.password`) + verificação de e-mail/OTP (`email_verification_codes`).
- **Autorização e Multi-Tenancy:** RBAC (`allRoles`) + contexto hierárquico matriz/filial (`x-company-id`, `x-view-scope`) + isolamento `colaborator`/`bundled`.
- **Upload, Arquivos e E-mail:** `@fastify/multipart` + `pdfjs-dist` (PDFs de NF em `archives/` particionados por `companyId`) + `nodemailer` (SMTP).
- **Segurança de Borda e Observabilidade:** `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, Pino + envio nativo em lote para Axiom (`src/config/logger.ts`) + auditoria LGPD (`audit_logs`, `legal_acceptances`, `security_incidents`).
- **Infraestrutura, Testes e Evolução Financeira/Fiscal:** Docker / Docker Compose (`read_only` + `USER bun`), Nginx (`infra/`), Oracle Cloud VM, suíte `bun test` (`src/tests/`), futura integração NFS-e ADN (`IMPLEMENTACAO_NFSE_ADN.md`) e futuros módulos de **Financeiro, Contabilidade e Pagamentos**.

---

## Checklist Rápido Pré-PR / Pré-Deploy

Antes de concluir qualquer alteração neste repositório, verifique:

- [ ] A rota exige `authMiddleware` e `inspectRole(...)` explícito (ou é intencionalmente pública)?
- [ ] Consultas e mutações filtram pelo escopo de tenant (`request.tenant.accessibleCompanyIds`) e respeitam a regra do `colaborator` (`bundled`)?
- [ ] Entradas (`params`, `querystring`, `body`, `headers`) e saídas (`response[status]`) possuem schemas Zod restritivos (sem vazamento de `password`, `cpf` bruto ou campos internos)?
- [ ] Mutações no Drizzle mapeiam explicitamente os campos permitidos (zero spread direto de `request.body`) e não usam `sql.raw()` com entrada do usuário?
- [ ] Uploads validam tamanho máximo, tipo MIME e assinatura real do arquivo (`%PDF-`), usando nomes/caminhos seguros dentro de `archives/`?
- [ ] Dados inseridos em HTML de e-mails (`nodemailer`) estão escapados e cabeçalhos (`to`, `subject`) bloqueiam quebras de linha (`\r`, `\n`)?
- [ ] Erros retornados ao cliente não expõem stack trace, queries SQL, caminhos locais ou detalhes de infraestrutura?
- [ ] Segredos, tokens, senhas, CPFs, chaves PIX, dados bancários e códigos OTP estão redigidos nos logs (Pino) e fora do controle de versão (`.env`, `archives/`, scripts em `infra/` sem IPs/chaves reais)?
- [ ] Operações financeiras/contábeis usam aritmética exata (sem `Number` flutuante), transação + lock/máquina de estados, `Idempotency-Key`, partidas dobradas/estorno *append-only* e recálculo 100% server-side?
- [ ] Webhooks de pagamento/banco validam assinatura HMAC sobre *raw body* (`timingSafeEqual`) + anti-replay, e exportações CSV/XLSX neutralizam fórmulas (`=`, `+`, `-`, `@`)?
- [ ] Novas dependências foram auditadas (`bun audit`) e não introduzem vulnerabilidades conhecidas?
- [ ] Mudanças de rota, permissão, auditoria ou produção foram documentadas em `CHANGELOG.md`?

---

## Mapa Curado do OWASP Cheat Sheet Series

### Cheat Sheets Aplicáveis à Nossa Stack

| Domínio no Projeto | Cheat Sheets OWASP Recomendados | Onde se Aplica no Repositório |
| --- | --- | --- |
| **Autenticação, Senhas e OTP** | [Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [Email Validation and Verification](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html), [Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html), [Multifactor Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) | `src/lib/hash.ts`, `src/router/public/login/`, `src/router/public/password/`, `src/router/private/account/`, `emailVerificationCodes` |
| **JWT e Sessão** | [JSON Web Token](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | `src/lib/jwt/jwt.ts`, `src/middlewares/auth.middleware.ts` |
| **Autorização, Multi-Tenant e IDOR** | [Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [Access Control](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html), [Multi-Tenant Security](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html), [IDOR Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html), [Authorization Decisions & Output Handling](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Decisions_And_Output_Handling_Cheat_Sheet.html), [Authorization Regression Testing](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html), [Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) | `src/middlewares/auth.middleware.ts`, `src/middlewares/role.middleware.ts`, `src/router/private/*`, `src/database/tables/*` |
| **API REST, Zod e TypeScript/JS** | [REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html), [REST Assessment](https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html), [Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), [Mass Assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html), [JavaScript and TypeScript Security](https://cheatsheetseries.owasp.org/cheatsheets/JavaScript_and_TypeScript_Security_Cheat_Sheet.html), [Prototype Pollution Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html), [Nodejs Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) | `src/app.ts`, `src/router/**/**.schemas.ts`, `src/router/private/admin/data/` |
| **PostgreSQL e Drizzle ORM** | [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html), [Query Parameterization](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html), [Database Security](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html), [Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html) | `src/database/index.ts`, `src/database/schema/schema.ts`, `src/database/tables/*` |
| **Upload de PDFs, Paths e E-mail HTML** | [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [Path Traversal Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Path_Traversal_Prevention_Cheat_Sheet.html), [Cross-Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) | `src/app.ts`, `src/router/private/NF/`, `archives/`, `src/lib/nodemailer/nodemailer.ts` |
| **Headers, CORS e TLS/Proxy** | [HTTP Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [CORS Security](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Security_Cheat_Sheet.html), [HSTS](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html), [Transport Layer Security](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html), [Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) | `src/policies/cors.ts`, `src/policies/helmet.ts`, `src/app.ts`, `infra/nginx-backend-pfm.conf` |
| **Rate Limit, Bots e DoS** | [Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html), [Bot Management and Anti-Automation](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html) | `src/policies/rateLimit.ts`, `src/router/**/**.options.ts`, `infra/nginx-backend-pfm.conf` |
| **Logs, Auditoria, Erros e LGPD** | [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [Logging Vocabulary](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html), [Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html), [User Privacy Protection](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html) | `src/config/logger.ts`, `src/lib/lgpd/*`, `src/app.ts`, `src/router/error.schema.ts` |
| **Segredos e Criptografia** | [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), [Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html) | `.env`, `.env.example`, `src/lib/hash.ts`, `src/lib/jwt/jwt.ts` |
| **Docker, Dependências e CI/CD** | [Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html), [NodeJS Docker](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html), [NPM Security](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html), [Vulnerable Dependency Management](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html), [Software Supply Chain Security](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html), [CI/CD Security](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html) | `Dockerfile`, `compose.yaml`, `compose.production.yaml`, `infra/deploy-off-vm.sh`, `infra/vps-tune-oci-micro.sh`, `package.json`, `bun.lock` |
| **Financeiro, Contabilidade & Pagamentos** | [Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html), [Third-Party Payment Gateway Integration](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html), [Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html), [Business Logic Security](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html), [Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html) | Futuros módulos de contas a pagar/receber, conciliação bancária, ledger contábil, PIX/boletos e fechamento de período |
| **NFS-e ADN / XML / Mobile / IA** | [SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), [XML Security](https://cheatsheetseries.owasp.org/cheatsheets/XML_Security_Cheat_Sheet.html), [XXE Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html), [Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html), [Mobile Application Security](https://cheatsheetseries.owasp.org/cheatsheets/Mobile_Application_Security_Cheat_Sheet.html), [Secure Code Review](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html), [Threat Modeling](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html), [Abuse Case](https://cheatsheetseries.owasp.org/cheatsheets/Abuse_Case_Cheat_Sheet.html), [Attack Surface Analysis](https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html), [Secure Coding with AI](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html) | Futura integração NFS-e ADN (`IMPLEMENTACAO_NFSE_ADN.md`), clientes mobile/web, fluxo de desenvolvimento |

> **Nota sobre itens do índice OWASP fora de escopo:** Guias específicos de outras linguagens/frameworks (Django, Laravel, Symfony, Ruby on Rails, .NET, Java/JAAS, PHP), orquestradores não usados (Kubernetes, Serverless), protocolos ausentes (GraphQL, gRPC, SAML, LDAP, NoSQL) e nichos não aplicáveis (Automotive, Drone, Browser Extensions) não fazem parte da stack atual deste backend. Caso um frontend web/React ou integração OAuth2/Passkey seja adicionado ao ecossistema, consulte também `React_Security_Cheat_Sheet`, `Web_Frontend_Security_Cheat_Sheet`, `OAuth2_Cheat_Sheet` e `Passkey_Security_Cheat_Sheet`.

---

## Padrões Obrigatórios por Domínio

### 1. Autenticação, Armazenamento de Senhas, Recuperação e E-mail OTP

- **Algoritmo de senha:** Manter `Argon2id` com custo de memória mínimo recomendado (`memoryCost: 65536` = 64 MiB, `timeCost: 3`) em `src/lib/hash.ts` via `Bun.password.hash`. Nunca retornar hashes em respostas ou logs.
- **Política de senha e primeiro acesso:** Exigir comprimento mínimo adequado (mínimo 8 caracteres, ideal 12+ ou passphrase; aceitar caracteres Unicode e espaços, limitando tamanho máximo como ~128 para evitar DoS em hashing). Manter `passwordChangeRequired: true` para senhas provisórias e forçar troca via `PATCH /account/password`.
- **Prevenção de enumeração de contas:** Mensagens e códigos HTTP em login, recuperação de senha (`usecaseForgotPassword`) e verificação de e-mail devem ser **uniformes** (mesma resposta e comportamento observável existindo ou não o usuário).
- **Códigos OTP e recuperação de senha:**
  - Gerar códigos exclusivamente com CSPRNG (`crypto.randomInt`), nunca `Math.random()`.
  - Definir TTL curto (ex.: 15 minutos), uso único (`verifyAndConsumeCode`), **limite estrito de tentativas por código** (invalidar o código após 3–5 erros para impedir força bruta em códigos de 6 dígitos) e cooldown entre reenvios.
  - Armazenar o código com hash (ou comparação em tempo constante) quando persistido no banco.
- **Canonicalização de e-mail:** Normalizar e-mail (`trim().toLowerCase()`) antes de persistir, comparar ou gerar OTP; validar tamanho máximo (254/320 caracteres) e evitar regex suscetível a ReDoS.
- **Anti-automação / Credential Stuffing:** Aplicar rate limit restrito por IP + identificador (usuário/e-mail) em `/public/login`, `/public/forgot-password`, `/public/reset-password` e rotas de verificação por e-mail. Para contas `administrator` e `company_admin`, planejar suporte a MFA (TOTP/Passkeys).

---

### 2. Sessão e JWT

- **Segredo forte e fail-fast:** `JWT_SECRET` deve ter entropia mínima de 256 bits (32+ bytes aleatórios) em produção. A aplicação deve recusar subir em `NODE_ENV=production` se `JWT_SECRET` estiver ausente, curto ou igual ao valor de `.env.example`.
- **Algoritmo explícito e verificação estrita:** Fixar algoritmo simétrico forte (`HS256`) tanto na assinatura (`jwtTokenGenerate`) quanto na verificação (`jwtVerify`) para evitar ataques de `alg: none` ou confusão de algoritmo.
- **Expiração curta e payload mínimo:** Manter `expiresIn: "30m"` (ou menor) e incluir no payload apenas claims estritamente necessários (`id`/`sub`, `role` informativo, `iat`, `exp`). Nunca colocar CPF, e-mail, dados bancários ou segredos no token.
- **Revogação e estado no banco:** Como já implementado em `src/middlewares/auth.middleware.ts`, **sempre** revalidar usuário ativo, role ativa e permissões de tenant no banco em cada requisição protegida.
- **Invalidação em troca/reset de senha e desativação:** Além da checagem de `user.active`, registrar `passwordUpdatedAt` (ou `tokenVersion`) no usuário e validar contra o `iat` (ou `tokenVersion`) do JWT para invalidar imediatamente tokens emitidos antes de troca/redefinição de senha ou comprometimento de conta.
- **Transporte seguro:** Enviar tokens apenas no header `Authorization: Bearer <token>` sobre HTTPS; nunca passar JWT em query string (`?token=...`), pois vaza em logs de proxy, histórico e `Referer`.

---

### 3. Autorização, RBAC, Multi-Tenancy e Prevenção de IDOR

- **Deny-by-default:** Toda rota fora de `/public/*` deve passar por `authMiddleware` e `inspectRole([...])`. Em caso de dúvida ou ausência de regra explícita, negar (`403`).
- **Isolamento Multi-Tenant obrigatório:**
  - Toda tabela vinculada a uma empresa (`clients`, `services`, `movimentations`, `nf`, `user_companies`, etc.) deve filtrar suas queries por `inArray(tabela.companyId, request.tenant.accessibleCompanyIds)` (ou equivalente validado no UseCase/Repository).
  - Nunca confiar em `companyId` enviado no `body` ou `querystring` sem validar contra `request.tenant.accessibleCompanyIds`.
  - O header `x-company-id` e `x-view-scope=consolidated` só têm efeito após validação rigorosa de vínculo usuário↔empresa/matriz em `authMiddleware`.
- **Prevenção de IDOR (Broken Object Level Authorization):**
  - Em qualquer endpoint com `:id` (`GET /nf/:id/file`, `PATCH /services/:id`, `GET /admin/data/:table/:id`, etc.), buscar e validar o recurso **combinando `id` + escopo de tenant (`companyId`) + regra de ownership**.
  - **Regra Sagrada do `colaborator`:** Colaboradores nunca veem dados globais da empresa nem ativam escopo `consolidated`; o acesso a serviços deve passar obrigatoriamente pela tabela `bundled` filtrada por `request.user.id`.
- **Rotas administrativas dinâmicas (`/admin/data/:table`):**
  - Restritas exclusivamente ao papel `administrator`.
  - Manter **allowlist explícita** de tabelas, colunas filtráveis, colunas graváveis e colunas retornáveis; jamais expor hashes de senha ou segredos; aplicar paginação com `limit` máximo rigoroso.
- **Testes de regressão de autorização:** Cobrir sistematicamente acessos verticais (role menor tentando rota de role maior), horizontais (`colaborator` A tentando serviço do `colaborator` B) e cross-tenant (usuário da empresa A enviando `x-company-id` ou `:id` da empresa B).

---

### 4. Segurança de API REST, Validação de Entrada, Mass Assignment e TypeScript/JS

- **Validação estrita com Zod (entrada e saída):**
  - Validar `params` (ex.: UUID v4/v7 com `z.uuid()`), `querystring` (com `.max()` em paginação, ex.: `limit <= 100`), `headers` e `body`.
  - Declarar schemas de resposta (`response[200]`, etc.) como camada de **output filtering** para garantir que campos extras retornados pelo Drizzle nunca vazem na resposta HTTP.
- **Prevenção de Mass Assignment:** Nunca passar `request.body` diretamente para `.insert(...).values(body)` ou `.update(...).set(body)`. Mapear explicitamente campo a campo no UseCase/Repository, especialmente evitando sobrescrita de `roleId`, `active`, `primaryCompanyId`, `companyId`, `passwordChangeRequired` ou `anonymizedAt`.
- **Segurança JavaScript/TypeScript:**
  - Nunca usar `eval`, `new Function`, `vm` ou `child_process`/`Bun.spawn` com entradas controladas pelo usuário.
  - Prevenir **Prototype Pollution**: evitar acesso/atribuição dinâmica em objetos usando chaves não validadas (`obj[key] = val` onde `key` pode ser `__proto__`, `constructor`, `prototype`); preferir `Map` ou `Object.hasOwn()` / allowlists `switch`/`Record` tipado.
  - Prevenir **ReDoS (Evil Regex)**: não escrever expressões regulares com quantificadores aninhados (`(a+)+`) aplicadas a inputs sem limite de tamanho.
  - Evitar `JSON.parse` em payloads gigantes; confiar no `bodyLimit` do Fastify e na validação Zod.
  - Usar operadores estritos (`===`, `!==`) e comparações de tempo constante (`crypto.timingSafeEqual`) ao comparar segredos/tokens.

---

### 5. PostgreSQL, Drizzle ORM e Prevenção de Injeção

- **Queries parametrizadas por padrão:** Usar os builders tipados do Drizzle (`eq`, `and`, `inArray`, `ilike`) que geram queries parametrizadas automaticamente.
- **Proibição de concatenação SQL:** Nunca usar `sql.raw()` com qualquer fragmento vindo do usuário (filtros, ordenação, nomes de colunas ou tabelas). Para ordenação ou tabela dinâmica (`/admin/data/:table`), mapear uma **allowlist fixa** de chaves TypeScript para referências de colunas/tabelas Drizzle.
- **Menor privilégio no PostgreSQL:**
  - A aplicação em produção **não deve** conectar como superusuário (`postgres` ou `root`); usar um role dedicado com permissões apenas de DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) nas tabelas da aplicação, separando migrations para usuário administrativo quando aplicável.
  - Manter PostgreSQL isolado na rede interna do Docker (`ports: !override []` em `compose.production.yaml`), jamais exposto na internet.
- **Integridade financeira e tipos:** Usar `numeric(10, 2)` no PostgreSQL para valores monetários e evitar aritmética em ponto flutuante binário (`Number` impreciso) ao consolidar notas e movimentações.

---

### 6. Upload de Arquivos (PDFs de NF), Path Traversal e Segurança de E-mails HTML

- **Limites no `@fastify/multipart`:** Configurar explicitamente `limits` globais no registro do plugin em `src/app.ts` (`fileSize`, `files`, `fields`, `fieldNameSize`) compatíveis com o tamanho real de uma NF em PDF (ex.: 5–10 MB).
- **Validação de conteúdo real (Magic Bytes + Parsing):**
  - Não confiar apenas em `file.mimetype` ou extensão `.pdf` enviadas pelo cliente.
  - Validar os primeiros bytes (`%PDF-`) e processar/validar estrutura com `pdfjs-dist` com tratamento de erro e timeout/limites de páginas para evitar PDF bombs.
- **Prevenção de Path Traversal (`archives/`):**
  - Nunca usar `filename` enviado pelo cliente na composição de caminhos em disco.
  - Nomear arquivos a partir de identificadores validados internamente (ex.: `acessKey` validada com `/^\d{44}$/` ou UUID gerado no servidor) e usar allowlist para subdiretórios (`type`).
  - Sempre validar `const resolved = path.resolve(baseDir, ...)` garantindo `resolved.startsWith(path.resolve(baseDir) + path.sep)` antes de ler, gravar ou anexar no `nodemailer`.
- **Segurança ao servir PDFs (`GET /nf/:id/file`):**
  - Validar tenant (`request.tenant.accessibleCompanyIds`) antes de ler o disco.
  - Retornar com `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="NF-<numero>.pdf"` (ou `inline` apenas se estritamente necessário com CSP rígida) e `X-Content-Type-Options: nosniff`.
- **Segurança em E-mails HTML (`src/lib/nodemailer/nodemailer.ts`):**
  - **Sempre escapar HTML** (`&`, `<`, `>`, `"`, `'`) de qualquer campo dinâmico interpolado em templates HTML (`recipientName`, `companyName`, `adminName`, `reason`, `clientName`, `details`, `senderName`, `pixInfo.*`), prevenindo HTML/CSS injection e phishing dentro de e-mails corporativos.
  - Remover `\r` e `\n` de assuntos e destinatários para prevenir Email Header Injection.

---

### 7. Headers HTTP, CORS, TLS/HSTS e Proxy Reverso (Nginx)

- **Trust Proxy correto:** Configurar `trustProxy` na instância do Fastify em `src/app.ts` usando `TRUST_PROXY` (ex.: `1` quando atrás de um único Nginx local) e **usar `request.ip` do Fastify** em vez de confiar manualmente no header `x-forwarded-for` (que pode ser forjado se não for sobrescrito pelo proxy). Quando o Nginx receber tráfego direto da internet (sem CDN/WAF na frente), preferir `proxy_set_header X-Forwarded-For $remote_addr;` em vez de `$proxy_add_x_forwarded_for` para impedir spoofing de IP pelo cliente.
- **CORS restritivo em produção (`src/policies/cors.ts`):**
  - Nunca usar `*` em produção quando `credentials: true` estiver ativo. Definir `CORS_ORIGIN` com as origens exatas permitidas (HTTPS).
  - Avaliar se requisições sem `Origin` (clientes mobile nativos/curl) devem receber `Access-Control-Allow-Origin`: apps mobile nativos não exigem CORS; apenas navegadores aplicam Same-Origin Policy.
- **Headers de segurança e borda (`@fastify/helmet` + `infra/nginx-backend-pfm.conf`):**
  - Ativar `HSTS` (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) em produção (no Nginx e no Helmet atrás de HTTPS).
  - Manter `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (ou `strict-origin-when-cross-origin`), `limit_req_zone`/`limit_conn_zone` no Nginx contra flood e CSP adequada.
  - **Cuidado com `gzip` (BREACH):** se no futuro a API passar a autenticar via cookies `HttpOnly` com respostas que refletem entrada do usuário + segredo/token CSRF no corpo, desabilitar `gzip` nas rotas autenticadas ou mascarar o token CSRF por requisição.
- **Superfície mínima em produção:**
  - Manter `@fastify/swagger` e `@fastify/swagger-ui` (`/docs`) habilitados apenas quando `NODE_ENV !== "production"`.
  - Expor a porta da aplicação apenas em `127.0.0.1` (`compose.production.yaml`), delegando terminação TLS 1.2+/1.3 ao Nginx.

---

### 8. Rate Limiting, Anti-Bot e Proteção contra DoS

- **Rate limiting em camadas e por perfil:**
  - Usar IP real resolvido via `trustProxy` (e `request.user?.id` nas rotas autenticadas) como chave de contagem para evitar bloquear toda uma empresa atrás do mesmo NAT corporativo ou falhar em bloquear um atacante atrás de proxy.
  - Aplicar limites **rígidos** em endpoints sensíveis: login, `forgot-password`, `reset-password`, solicitação de cadastro de empresa, upload/parsing de PDF e `/account/privacy/export`.
  - Usar limites **proporcionais** nas rotas autenticadas comuns de leitura/dashboard (evitando falsos `429` como `max: 7/min` em telas que disparam múltiplas requisições simultâneas após login).
- **Limites de payload e timeouts (Anti-DoS):**
  - Configurar `bodyLimit` adequado no Fastify (ex.: `1048576` = 1 MiB para JSON; multipart com limite separado) e `requestTimeout` / `connectionTimeout` para mitigar Slowloris e payloads gigantes.
  - Limitar `limit` de paginação em todos os endpoints de listagem e relatórios.
- **Proteção contra bots na borda:** Bloquear ou limitar varreduras repetitivas (`POST /`, `/vpnsvc/connect.cgi`, `/.env`, `/wp-login.php`) diretamente no Nginx/Cloudflare/WAF antes de consumirem recursos da aplicação.

---

### 9. Logs, Auditoria, Tratamento de Erros e Privacidade (LGPD)

- **Redação rigorosa de dados sensíveis (`src/config/logger.ts`):**
  - Manter no `redact` do Pino: `authorization`, `cookie`, senhas, `cpf`, `email`, `token`, `code` e equivalentes em `body.*` e nível raiz. Revisar o `redact` sempre que novos campos sensíveis (ex.: certificados digitais, chaves de API, dados fiscais privados) forem adicionados.
- **Higiene dos logs de auditoria (`audit_logs`):**
  - Não gravar na tabela de auditoria `audit_logs` requisições `404` de rotas inexistentes (`!request.routeOptions.url`), evitando poluição por bots da internet e crescimento desnecessário da tabela. Registrar 404 públicos apenas nos logs estruturados de infraestrutura (Pino/Axiom/Nginx).
  - Adotar vocabulário consistente para eventos de segurança (ex.: `auth.login.success`, `auth.login.failed`, `auth.password.changed`, `auth.password.reset`, `authz.denied`, `account.privacy.export`, `account.privacy.anonymize`, `admin.data.*`) com correlação por `requestId`.
- **Tratamento seguro de erros (`Error Handling`):**
  - Nunca retornar mensagens internas do PostgreSQL, stack traces, paths do container ou detalhes de bibliotecas em respostas `4xx`/`5xx`. Logar o erro completo internamente e devolver mensagem genérica ao cliente.
  - Garantir que `auth.middleware.ts` e `onResponse` sempre tratem falhas sem derrubar o processo (`uncaughtException` / `unhandledRejection`).
- **Privacidade e LGPD:**
  - Minimizar coleta e exposição de dados pessoais (CPF mascarado em endpoints de conta, exportação restrita ao próprio titular, anonimização preservando apenas registros fiscais obrigatórios por 5 anos conforme Art. 16, I da LGPD).

---

### 10. Segredos, Criptografia e Gestão de Chaves

- **Zero segredos no código e no Git:** `.env`, chaves SSH, certificados digitais (A1 `.pfx/.p12` para NFS-e) e PDFs de clientes nunca podem ser versionados. Em caso de exposição histórica, rotacionar o segredo imediatamente além de limpar o histórico Git.
- **Validação de ambiente no startup:** Validar no boot todas as variáveis críticas (`JWT_SECRET`, `DATABASE_URL`, credenciais SMTP quando usadas) com comportamento fail-fast em produção se faltarem ou usarem placeholders inseguros.
- **Aleatoriedade criptográfica:** Usar exclusivamente `node:crypto` (`randomBytes`, `randomInt`, `randomUUID`) para tokens, códigos OTP, salts ou chaves; nunca `Math.random()`.
- **Criptografia de segredos em repouso (futuro NFS-e):** Caso certificados digitais A1 ou credenciais de terceiros por tenant precisem ser salvos no banco, cifrar com AES-256-GCM usando chave mestra gerenciada fora do banco e rotação versionada (`keyId`).

---

### 11. Docker, Dependências, Supply Chain e CI/CD

- **Container não-root (`Dockerfile`):**
  - O estágio `production` deve executar o processo como usuário sem privilégios (`USER bun`), garantindo permissão de escrita apenas no volume necessário (`archives/`).
  - Manter multi-stage build (`oven/bun:1-alpine`) contendo apenas `dist/` (bundle minificado + `pdf.worker.min.mjs`), sem `node_modules` nem devDependencies.
- **Hardening de runtime (`compose.production.yaml`):**
  - Manter `ports` da API vinculados exclusivamente a `127.0.0.1` e PostgreSQL sem porta publicada no host.
  - Manter `security_opt: ["no-new-privileges:true"]`, `cap_drop: ["ALL"]`, `read_only: true` com `tmpfs` em `/tmp`, `mem_limit`/`pids_limit` ajustados e volume específico em `/usr/src/app/archives`.
- **Gestão de dependências e Supply Chain:**
  - Sempre usar `--frozen-lockfile` em builds e deploys para evitar instalação silenciosa de versões não revisadas.
  - Executar `bun audit` regularmente (há script `security:update`, mas atualizações em produção devem passar por revisão de lockfile, `typecheck`, `build` e testes antes do deploy).
  - Desconfiar de pacotes novos com nomes parecidos (typosquatting) e verificar repositórios oficiais antes de adicionar dependências.

---

### 12. Integrações Externas (NFS-e ADN / XML), Backend Mobile e Desenvolvimento Seguro com IA

- **Futura integração NFS-e ADN / APIs externas (`IMPLEMENTACAO_NFSE_ADN.md`):**
  - **Prevenção de SSRF:** Nunca buscar URLs fornecidas pelo usuário; utilizar apenas endpoints oficiais em allowlist estrita, validar protocolo `https://`, aplicar timeout curto e bloquear redirecionamentos para IPs privados (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`).
  - **Segurança XML / Prevenção de XXE:** Ao gerar ou parsear XML de NFS-e, desabilitar explicitamente resolução de entidades externas (DTD / external entities), limitar profundidade/tamanho do XML e validar contra schema esperado.
  - **Webhooks (se houver):** Exigir assinatura HMAC verificada com `crypto.timingSafeEqual`, proteção contra replay via timestamp + nonce/eventId e processamento idempotente.
- **Boas práticas para APIs consumidas por Mobile:**
  - Não embutir segredos estáticos no app mobile esperando que sejam confidenciais; toda confiança deve residir no token de sessão do usuário autenticado e na autorização no servidor.
  - Retornar mensagens de erro seguras e suportar expiração/renovação limpa de sessão.
- **Desenvolvimento Seguro Assistido por IA (`Secure_Coding_with_AI_Cheat_Sheet`):**
  - Validar toda dependência sugerida por IA contra o registro oficial antes de instalar (prevenção a pacotes alucinados).
  - Revisar manualmente qualquer código gerado que toque em `authMiddleware`, `inspectRole`, filtros multi-tenant, `sql`, upload de arquivos, `nodemailer` ou configs Docker.
  - Nunca colar `.env`, tokens reais, dumps de produção ou chaves privadas em prompts/logs externos.

---

### 13. Padrões Obrigatórios para Futuras Implementações de Financeiro, Contabilidade, Pagamentos e Fiscal

Todo módulo futuro envolvendo **contas a pagar/receber, fluxo de caixa, conciliação bancária, lançamentos contábeis, plano de contas, DRE/balancete, PIX/boletos, webhooks de pagamento ou NFS-e ADN** deve seguir os 6 pilares abaixo desde o design do schema Drizzle:

#### 13.1 Integridade Contábil, Partidas Dobradas e Imutabilidade

- **Modelo *Append-Only* (Razão Imutável):** Lançamentos contábeis e movimentações financeiras confirmadas **nunca** sofrem `DELETE` físico nem `UPDATE` retroativo em valor, conta, data de competência ou centro de custo. Correções e cancelamentos devem gerar um **lançamento de estorno / ajuste** referenciando o registro original (`reversedEntryId`), preservando rastreabilidade total.
- **Partidas Dobradas (*Double-Entry*):** Cada lançamento contábil deve ser gravado em `db.transaction` validando no servidor que `SUM(débitos) === SUM(créditos)` (diferença exatamente `0`) e que todas as contas pertencem ao mesmo escopo autorizado do tenant.
- **Fechamento de Competência (`accounting_periods`):** Controlar períodos contábeis (`open` → `closing` → `closed` / `locked`). Rejeitar na camada de UseCase e via constraint/trigger no PostgreSQL qualquer lançamento ou estorno em período fechado; eventual reabertura deve exigir papel privilegiado + justificativa obrigatória + registro em `audit_logs`.
- **Aritmética Exata (Zero `Number` Flutuante):** Usar `numeric(14, 2)` (ou `numeric(18, 4)` para alíquotas/unitários) no PostgreSQL e operar no TypeScript exclusivamente com **`BigInt` em centavos/milésimos** ou biblioteca decimal fixa — nunca usar soma/multiplicação/rateio em ponto flutuante IEEE-754 (`Number`), nem aceitar valores negativos não previstos (ex.: quantidade/preço/desconto > bruto).
- **Integridade de Trilha Financeira:** Registrar `createdBy`, `approvedBy`, `companyId`, `requestId` e timestamp em UTC em toda tabela financeira; para livros fiscais/contábeis críticos, considerar hash encadeado (`prevHash` + SHA-256 canônico) por empresa/período para detecção de adulteração.

#### 13.2 Autorização Transacional, Segregação de Funções (SoD) e Idempotência

- **Segregação de Funções (*Maker-Checker*):** Quem cria uma ordem de pagamento, alteração de chave PIX/conta bancária ou ajuste contábil de alto valor **não pode** ser o mesmo usuário que aprova (`approvedBy !== createdBy`), respeitando alçadas configuráveis por valor e tenant.
- **Autorização por Transação (`Transaction_Authorization_Cheat_Sheet`):** Operações críticas (liberação de pagamento/PIX, alteração de dados bancários de favorecido/empresa, upload/troca de certificado A1, reabertura de período contábil) devem exigir reconfirmação de credencial/OTP vinculada explicitamente ao **resumo da operação** (valor, favorecido/chave, conta destino e nonce único de uso único com TTL curto), impedindo que um token de sessão reutilizado aprove outra transação.
- **Máquina de Estados e Locks no Banco (`Business_Logic_Security_Cheat_Sheet`):**
  - Modelar status no servidor (`draft` → `pending_approval` → `approved` → `scheduled` → `paid` / `failed` / `cancelled`) e validar transições permitidas via `UPDATE ... WHERE id = $1 AND company_id IN (...) AND status = $expected RETURNING *` (com `SELECT ... FOR UPDATE` quando envolver saldo ou limite de crédito) para impedir **race conditions / gasto duplo**.
  - **Sempre recalcular no servidor** totais, impostos (ISS, retenções), juros, multas e descontos; jamais aceitar `totalAmount`, `netAmount` ou `status` calculados pelo frontend.
- **Idempotência Obrigatória:** Endpoints de criação de pagamento, baixa, emissão de boleto/PIX ou emissão de NFS-e devem exigir header/chave `Idempotency-Key` com índice único composto `(company_id, endpoint, idempotency_key)` + comparação do hash SHA-256 do payload (retornando `409` se a mesma chave for reutilizada com corpo diferente).

#### 13.3 Gateways de Pagamento, PIX, Boletos, Webhooks e Bancos

- **Confirmação Server-to-Server (`Third_Party_Payment_Gateway_Integration_Cheat_Sheet`):** Nunca marcar título, fatura ou pedido como `paid` com base em redirect, callback de UI ou payload vindo do app mobile/navegador. A baixa ocorre **somente** via consulta autenticada na API do provedor/banco ou webhook criptograficamente verificado.
- **Segurança de Webhooks (`Webhook_Security_Cheat_Sheet`):**
  - Verificar assinatura HMAC (ex.: HMAC-SHA256) sobre o **raw body** exato usando `crypto.timingSafeEqual` (configurar parser no Fastify preservando o raw body apenas nas rotas de webhook).
  - Implementar **anti-replay**: rejeitar eventos com timestamp fora da janela (ex.: `±5 minutos`) e persistir `provider + eventId` em tabela com `UNIQUE` antes de processar.
  - Validar valor, moeda, status e `companyId` no banco antes de baixar títulos; sempre responder rapidamente (`2xx`) após enfileirar/gravar de forma idempotente para evitar tempestade de retentativas e DoS.
- **Minimização PCI-DSS e Dados Bancários:** Nunca armazenar número completo de cartão (PAN), CVV ou trilha magnética (usar tokenização do gateway). Dados bancários de favorecidos (PIX/agência/conta) devem ser validados por tenant e ter alteração auditada/notificada.
- **Chamadas de Saída (Bancos / Open Finance / SEFAZ ADN):** Aplicar allowlist estrita de domínios HTTPS, desabilitar redirects abertos, usar mTLS quando exigido (Padrão Nacional NFS-e / PIX BACEN) e aplicar timeouts curtos + circuit breaker.

#### 13.4 Importação de Extratos (OFX/CNAB/XML) e Exportação Contábil (CSV/XLSX)

- **Importação de Arquivos Bancários e Fiscais (OFX, CNAB 240/400, XML NF-e/NFS-e):**
  - Limitar tamanho de arquivo, quantidade de linhas e tempo de parsing; validar estrutura por schema antes de processar.
  - Em parsers XML/OFX SGML/XML, **desabilitar completamente DTD e entidades externas (XXE)** e limitar profundidade de tags.
  - Garantir **deduplicação na conciliação bancária** (chave única por `(bank_account_id, external_fitid)` ou hash determinístico dos campos da transação) para impedir importação duplicada de receitas/despesas.
- **Prevenção a *CSV / Formula Injection* em Exportações:**
  - Em qualquer exportação CSV/TSV/XLSX (extratos, DRE, razão, relatórios de clientes/NFs), prefixar com apóstrofo (`'`) ou neutralizar células cujo conteúdo (após espaços iniciais) comece com `=`, `+`, `-`, `@`, `\t` (`0x09`) ou `\r` (`0x0D`), impedindo execução de fórmulas maliciosas ao abrir no Excel/LibreOffice.

#### 13.5 Certificados Digitais A1 (e-CNPJ), Segredos por Tenant e Logs Financeiros

- **Armazenamento Cifrado de Certificados e Segredos Bancários (`Cryptographic_Storage_Cheat_Sheet` + `Key_Management_Cheat_Sheet`):**
  - Arquivos `.pfx`/`.p12`, senhas de certificado A1, `client_secret` de APIs bancárias e `webhook_secret` por empresa devem ser armazenados no banco cifrados via **Envelope Encryption (`AES-256-GCM`)**: DEK aleatória por registro (ou por tenant) + IV/nonce aleatório de 96 bits via `crypto.randomBytes(12)` (nunca reutilizar IV com a mesma chave) + `AAD` vinculando `companyId` e `recordId` + chave mestra (KEK) vinda exclusivamente de ambiente/KMS fora do banco, com `key_version` para rotação sem downtime.
  - Nunca gravar o `.pfx` descriptografado ou a chave privada em disco/logs/`/tmp`; manter o `Buffer` em memória apenas durante a assinatura XMLDsig ou handshake mTLS.
- **Redação de Logs Financeiros (`src/config/logger.ts`):**
  - Antes de ativar rotas financeiras/bancárias, adicionar ao `sharedRedact` do Pino todos os campos sensíveis novos: `pixKey`, `bankAccount`, `agency`, `accountNumber`, `certPassword`, `pfx`, `privateKey`, `clientSecret`, `webhookSecret`, `accessToken`, `refreshToken`, `authorizationCode` (em `body.*`, `*.campo` e raiz).

#### 13.6 RBAC Contábil Multi-Tenant e Retenção Legal vs. LGPD

- **Separação de Papéis Financeiro vs. Contábil:**
  - Avaliar papel dedicado `accountant` / `auditor` (somente leitura contábil/fiscal + fechamento/exportação SPED/DRE) distinto de `finance` (contas a pagar/receber) e de `company_admin` (gestão de usuários e alçadas), mantendo `colaborator` totalmente bloqueado de qualquer endpoint financeiro/contábil.
- **Consolidação Matriz/Filial (`x-view-scope=consolidated`):**
  - Em relatórios contábeis consolidados (DRE, balanço, fluxo de caixa), identificar e tratar explicitamente transferências *intercompany* entre matriz e filiais da mesma árvore para não inflar receitas/despesas nem misturar saldos bancários.
- **Retenção Legal vs. LGPD:**
  - Livros contábeis, comprovantes fiscais, guias de impostos e registros financeiros vinculados a obrigações tributárias/trabalhistas/cíveis devem respeitar guarda legal mínima de **5 a 10 anos** (conforme CTN/legislação aplicável), sendo preservados de exclusão destrutiva na anonimização LGPD (Art. 16, I da Lei nº 13.709/2018) com minimização dos dados pessoais acessórios.

---

## Diagnóstico Atual do Projeto (Status vs. Backlog de Hardening)

*Estado atualizado em `2026-11-27` após revisão geral de segurança, testes de estresse locais e blindagem em rodadas P1, P2 e P3:*

### Controles implementados e verificados

- Senhas com **Argon2id** (`src/lib/hash.ts`), `JWT_SECRET` fail-fast, algoritmo `HS256` fixado e revogação imediata pós-troca/reset de senha via `token_version` (`drizzle/0019_user_token_version.sql`, `src/lib/jwt/jwt.ts`, `src/middlewares/auth.middleware.ts`).
- Revalidação de usuário/role ativos, bloqueio de `passwordChangeRequired` no servidor (sincronizado no frontend), validação de `x-company-id` e isolamento multi-tenant *fail-closed* (`src/middlewares/auth.middleware.ts`, `src/lib/tenant.ts`, repositórios).
- Escopo restrito de `company_admin` por matriz/filial e troca atômica de empresa sem vínculo residual (`src/router/private/companies/`).
- Restrição de `colaborator` em `/clients` (`bundled` ativos + CPF mascarado) e restrição de mutações globais em `/types` ao `administrator`.
- Proteção contra Path Traversal em `archives/` (`src/lib/archivePath.ts`, `src/router/private/NF/sendEmailNf/`, `getNfFile.controller.ts` com streaming `createReadStream`), limites no `@fastify/multipart` (`10 MB`, `1` arquivo), magic bytes `%PDF-`, limite de `20` páginas, `disableFontFace: true` e timeout no `pdfjs-dist`.
- Escape HTML e sanitização de headers no Nodemailer (`src/lib/nodemailer/nodemailer.ts`), verificação atômica e cooldown de OTP (`emailVerificationCodes.repository.ts`), verificação OTP antes de checagens de conflito no onboarding público e timing protection no login (`login.usecase.ts`).
- Allowlist de escrita em `/admin/data/:table`, transação atômica na aprovação/rejeição de empresas, update atômico de serviços, validação de CPF corrigida (`src/utils/checkCpf.ts`) e remoção de Mass Assignment de `id`/`cancelDate`/`pathFile`.
- `trustProxy` configurado com `request.ip`, filtro de `404` públicos fora de `audit_logs`, auditoria de `/notes/:id/file`, Swagger carregado dinamicamente apenas fora de produção (`devDependencies`), error handler global, redação Pino com wildcards + stream nativo em lote para Axiom com timeout de 5s (`src/config/logger.ts`), graceful shutdown (`src/server.ts`), timeouts no PostgreSQL (`src/database/index.ts`), `demoSeed` bloqueado em produção e limpeza de `security_incidents` (5 anos) em `retention.ts`.
- Imagem de produção `oven/bun:1-alpine` sem `node_modules` e sem root (`USER bun`), `compose.production.yaml` com `read_only: true`, `tmpfs` em `/tmp`, `no-new-privileges:true`, `cap_drop: ALL` e limites de memória/PIDs, CSP/headers no frontend com `connect-src` restrito em `nginx.conf` e `vercel.json`, e `infra/nginx-backend-pfm.conf` bloqueando scans comuns na borda com `limit_req_zone`/`limit_conn_zone` e `X-Forwarded-For $remote_addr`.
- Correções pontuais da revisão de `2026-11-26` implementadas e verificadas:
  - `src/config/logger.ts`: `flush()` aguarda `inFlightFlush` (eliminando busy-loop no shutdown) e `resolveSafeAxiomUrl` exige `https://` em produção para `AXIOM_URL`.
  - `infra/deploy-off-vm.sh`: removido IP real da VM e substituído por placeholder `ubuntu@seu-servidor.exemplo`.
  - `src/router/private/admin/lgpd/adminLgpd.route.ts` e `frontend-pfm/src/services/privacy.ts`: exposto `deletedExpiredIncidents` no retorno de `POST /admin/lgpd/cleanup`.
  - `src/database/seed.ts`: checagem de `administrator.system` antes de exigir `ADMIN_DEFAULT_PASSWORD`/`CPFADMIN`, bloqueio de senha placeholder em produção e inserção atômica em transação.
- Blindagens P1/P2/P3 da auditoria de `2026-11-27` implementadas e verificadas:
  - **P1 (`finance`):** vínculo intercompany restrito ao mesmo grupo econômico (`motherId`, eliminando oráculo cross-tenant), bloqueio de alteração de contraparte pós-baixa e derivação autoritativa a partir de cliente ativo não anonimizado (`updateEntry`), proteção de `kind`/`dreGroup`/`parentId` em categorias de sistema + detecção de ciclos em `parentId`, validação estrita de calendário em `isoDateSchema` / `diffDaysIso` / exportação CSV, e suporte explícito a saldo inicial negativo em contas bancárias/cartões (`intToCents(..., { allowNegative: true })`).
  - **P2 (`finance`, `public`, `frontend-pfm`):** conversão de erros matemáticos de domínio para HTTP `400`, tratamento de colisão `23505` / reuso cross-endpoint de `Idempotency-Key` como `409` ou replay seguro (+ chave estável em retries no `FinancePanel.tsx`), consistência estrita Serviço ↔ NF ↔ Cliente em `/finance/entries` e `/from-service/:serviceId`, e respostas uniformes `200` em `/public/company-requests/request-code` e `/public/password/forgot` (eliminando oráculos de enumeração de e-mail, CNPJ e cooldown).
  - **P3 (`finance`, `account`, `lgpd`, `adminData`):** `Cache-Control: private, no-store` e rate limit `sensitive` em `GET /finance/reports/export` (e `Cache-Control: private, no-store` nas rotas `/account/privacy/*`), expurgo de `financial_idempotency_keys` após 30 dias em `retention.ts` (exposto em `/admin/lgpd/cleanup`), e rejeição com `400` de payloads vazios/fora da allowlist em `/admin/data/:table`.
- Suíte de testes automatizados (`bun test`: 28 testes base + regressões P1/P2/P3 em `src/tests/finance.test.ts`, `src/tests/security.test.ts` e `src/tests/infra.test.ts`).

> **Aviso operacional de deploy (volume `nf_archives`):** Como o container de produção do backend executa como `USER bun`, se o volume `nf_archives` já existir na VM com dono `root:root`, execute `docker compose -f compose.yaml -f compose.production.yaml run --rm --user root backend chown -R bun:bun /usr/src/app/archives` e aplique a migration `drizzle/0019_user_token_version.sql` ao atualizar a produção.

### Evoluções estruturais recomendadas (Médio Prazo)

1. **Sessão Web via Cookie `HttpOnly; Secure; SameSite` + Refresh Token rotativo:** substituir o armazenamento de JWT em `localStorage` no frontend web, com proteção CSRF (e remover `gzip` em respostas JSON autenticadas sensíveis se usar cookies).
2. **MFA (TOTP ou Passkeys):** segundo fator obrigatório para contas `administrator`, `company_admin` e usuários com alçada de aprovação financeira/contábil.
3. **Menor privilégio no PostgreSQL + `NOT NULL` em `company_id`:** separar usuário DML da aplicação da conta de migrations e aplicar `NOT NULL` nas FKs de tenant após backfill.
