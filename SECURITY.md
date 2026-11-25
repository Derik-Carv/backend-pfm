# Guia de Segurança do Projeto — Padrões OWASP Aplicados à Stack

> **CONSULTA OBRIGATÓRIA:**
> Este documento (`SECURITY.md`) é referência permanente de segurança do **Backend PFM** e **deve ser consultado antes de implementar ou alterar** qualquer rota, schema Zod, middleware, repositório Drizzle, upload de arquivo, envio de e-mail, integração externa, variável de ambiente ou configuração de deploy/Docker.
>
> Base oficial: [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/index.html) | Última revisão: `2026-11-25`.

---

## Stack Coberta por Este Guia

- **Runtime e Linguagem:** Bun 1.x + TypeScript 5.9 (`strict`).
- **Framework HTTP e Contratos:** Fastify v5 + Zod 4 (`fastify-type-provider-zod`) + Swagger/OpenAPI (apenas em desenvolvimento).
- **Banco de Dados e ORM:** PostgreSQL 16+ + Drizzle ORM (`postgres.js`).
- **Autenticação e Sessão:** `@fastify/jwt` (tokens de 30 min) + Argon2id (`Bun.password`) + verificação de e-mail/OTP (`email_verification_codes`).
- **Autorização e Multi-Tenancy:** RBAC (`allRoles`) + contexto hierárquico matriz/filial (`x-company-id`, `x-view-scope`) + isolamento `colaborator`/`bundled`.
- **Upload, Arquivos e E-mail:** `@fastify/multipart` + `pdfjs-dist` (PDFs de NF em `archives/`) + `nodemailer` (SMTP).
- **Segurança de Borda e Observabilidade:** `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, Pino + Axiom (`@axiomhq/pino`) + auditoria LGPD (`audit_logs`, `legal_acceptances`, `security_incidents`).
- **Infraestrutura e Integrações:** Docker / Docker Compose + Nginx + HTTPS (Oracle Cloud VM) + futura integração NFS-e ADN (XML/API externa).

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
- [ ] Segredos, tokens, senhas, CPFs e códigos OTP estão redigidos nos logs (Pino) e fora do controle de versão (`.env`, `archives/`)?
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
| **Headers, CORS e TLS/Proxy** | [HTTP Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html), [CORS Security](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Security_Cheat_Sheet.html), [HSTS](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html), [Transport Layer Security](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html), [Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html) | `src/policies/cors.ts`, `src/policies/helmet.ts`, `src/app.ts`, Nginx / Oracle Cloud |
| **Rate Limit, Bots e DoS** | [Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html), [Bot Management and Anti-Automation](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html) | `src/policies/rateLimit.ts`, `src/router/**/**.options.ts`, Nginx |
| **Logs, Auditoria, Erros e LGPD** | [Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [Logging Vocabulary](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html), [Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html), [User Privacy Protection](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html) | `src/config/logger.ts`, `src/lib/lgpd/*`, `src/app.ts`, `src/router/error.schema.ts` |
| **Segredos e Criptografia** | [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), [Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html) | `.env`, `.env.example`, `src/lib/hash.ts`, `src/lib/jwt/jwt.ts` |
| **Docker, Dependências e CI/CD** | [Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html), [NodeJS Docker](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html), [NPM Security](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html), [Vulnerable Dependency Management](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html), [Software Supply Chain Security](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html), [CI/CD Security](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html) | `Dockerfile`, `compose.yaml`, `compose.production.yaml`, `package.json`, `bun.lock` |
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

- **Trust Proxy correto:** Configurar `trustProxy` na instância do Fastify em `src/app.ts` usando `TRUST_PROXY_HOPS` (ex.: `1` quando atrás de um único Nginx local) e **usar `request.ip` do Fastify** em vez de confiar manualmente no header `x-forwarded-for` (que pode ser forjado se não for sanitizado pelo proxy).
- **CORS restritivo em produção (`src/policies/cors.ts`):**
  - Nunca usar `*` em produção quando `credentials: true` estiver ativo. Definir `CORS_ORIGIN` com as origens exatas permitidas (HTTPS).
  - Avaliar se requisições sem `Origin` (clientes mobile nativos/curl) devem receber `Access-Control-Allow-Origin`: apps mobile nativos não exigem CORS; apenas navegadores aplicam Same-Origin Policy.
- **Headers de segurança (`@fastify/helmet` + Nginx):**
  - Ativar `HSTS` (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) em produção (no Nginx ou no Helmet atrás de HTTPS).
  - Manter `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` ou `SAMEORIGIN`, `Referrer-Policy: no-referrer` (ou `strict-origin-when-cross-origin`) e CSP adequada para endpoints que retornam HTML/arquivos.
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
  - Manter multi-stage build (`oven/bun:1-slim`) contendo apenas `dist/` e dependências de produção (`bun install --production --frozen-lockfile`).
- **Hardening de runtime (`compose.production.yaml`):**
  - Manter `ports` da API vinculados exclusivamente a `127.0.0.1` e PostgreSQL sem porta publicada no host.
  - Avaliar adicionar `security_opt: ["no-new-privileges:true"]`, `cap_drop: ["ALL"]` e `read_only: true` (com `tmpfs` se necessário e volume específico em `/usr/src/app/archives`).
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

## Diagnóstico Atual do Projeto (Status vs. Backlog de Hardening)

*Estado observado diretamente no código-fonte em `2026-11-25` (apenas levantamento de referência; aplicar em PRs específicos):*

### Controles já implementados positivamente

- Senhas com **Argon2id** (`src/lib/hash.ts`).
- Revalidação de usuário/role ativos e vínculo multi-tenant em cada requisição protegida (`src/middlewares/auth.middleware.ts`).
- Swagger/OpenAPI restrito a ambientes não produtivos (`src/app.ts`).
- Resposta anti-enumeração na recuperação de senha (`src/router/public/password/password.usecase.ts`) e remoção de BCC global entre tenants no envio de NF (`src/lib/nodemailer/nodemailer.ts`).
- Redação de segredos e PII no logger Pino (`src/config/logger.ts`) e isolamento do PostgreSQL e da porta `3336` em `127.0.0.1` (`compose.production.yaml`).

### Backlog prioritário de melhorias identificadas

1. **`trustProxy` e IP real (`src/app.ts`, `src/lib/lgpd/audit.ts`):** `TRUST_PROXY_HOPS=1` já consta no `.env.example`, mas `fastify({...})` não configura `trustProxy`, e `extractRequestMeta` lê `x-forwarded-for` diretamente (sujeito a spoofing caso não seja sobrescrito pelo proxy). Configurar `trustProxy` no Fastify e ler `request.ip`.
2. **Filtro de `audit_logs` para `404` públicos (`src/app.ts`):** O hook `onResponse` grava na tabela `audit_logs` requisições `POST` em rotas inexistentes (`!request.routeOptions.url`), permitindo que bots poluam a tabela de auditoria LGPD. Ignorar rotas não casadas na persistência de auditoria (mantendo apenas no Pino).
3. **Perfis de Rate Limit (`src/policies/rateLimit.ts`):** O perfil `default` (`max: 7/min`) no hook `onRequest` é muito restritivo para rotas autenticadas comuns (gera falsos `429` como `público` antes da validação JWT). Separar perfil rígido para rotas públicas sensíveis e perfil adequado para rotas autenticadas com chave por `userId`/IP.
4. **Limites no `@fastify/multipart` (`src/app.ts`):** Registrar `limits` explícitos (`fileSize`, `files`, `fields`) e reforçar validação de assinatura `%PDF-` + path canonical (`path.resolve`) ao manipular arquivos em `archives/`.
5. **Container não-root e hardening Docker (`Dockerfile`, `compose.production.yaml`):** Adicionar `USER bun` no estágio `production` do `Dockerfile` e restrições de privilégios (`no-new-privileges`, `cap_drop`) no Compose de produção.
6. **Escape HTML em e-mails e validação de caminho (`src/lib/nodemailer/nodemailer.ts`):** Escapar variáveis interpoladas nos templates HTML de e-mail e validar caminho canônico do PDF antes de anexar.
7. **HSTS em produção (`src/policies/helmet.ts` / Nginx):** Garantir que `Strict-Transport-Security` esteja ativo na camada HTTPS de produção.
8. **Fail-fast de `JWT_SECRET`, limite de tentativas em OTP e revogação pós-troca de senha:** Validar força de `JWT_SECRET` no startup em produção, limitar tentativas por código em `emailVerificationCodes` e invalidar JWTs emitidos antes da troca/redefinição de senha.
