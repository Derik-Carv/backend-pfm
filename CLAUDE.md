# INSTRUÇÕES DO PROJETO — BACKEND MOBILE

> **Atenção para qualquer IA ou agente de desenvolvimento:**  
> Este documento é a fonte definitiva de verdade (Single Source of Truth) sobre a arquitetura, regras de negócio, bibliotecas, padrões de design e regras invioláveis deste projeto. **Leia com atenção antes de sugerir ou executar qualquer alteração.**

---

## 1. Visão Geral e Ecossistema

Este backend é uma API RESTful de alta performance voltada para um aplicativo mobile de gestão de serviços, notas fiscais, clientes, colaboradores e finanças.

### Stack Tecnológica:

- **Runtime:** [Bun](https://bun.sh) (TypeScript nativo de ponta a ponta).
- **Framework Web:** [Fastify v5](https://fastify.dev) com arquitetura orientada a plugins e rotas modularizadas.
- **Validação & Tipagem:** [Zod](https://zod.dev) integrado ao Fastify via `fastify-type-provider-zod`.
- **Banco de Dados & ORM:** PostgreSQL 16+ via [Drizzle ORM](https://orm.drizzle.team) e driver `postgres.js`.
- **Autenticação:** JWT via `@fastify/jwt` com senhas em Argon2 / Hash customizado e política de troca no primeiro login.
- **Upload & Parsing:** `@fastify/multipart` para PDFs de Notas Fiscais e validação/extração via `pdfjs-dist` / `pdf-parse`.
- **Documentação de API:** `@fastify/swagger` e `@fastify/swagger-ui`.
- **Observabilidade:** Pino, Pino Pretty, Axiom (`@axiomhq/pino`) e auditoria de ações sensíveis em produção.

---

## 2. Padrões de Arquitetura e Estrutura de Código

O projeto adota uma variação pragmática de **Clean Architecture** orientada a Use Cases com Injeção de Dependências em Repositórios baseados em Classes e Interfaces.

### 2.1 Estrutura de Diretórios (`src/`):

```text
src/
├── database/
│   ├── index.ts               # Conexão com Postgres via Drizzle
│   ├── schema/                # Schemas de tabelas Drizzle (schema.ts)
│   ├── seed.ts                # Seed inicial com roles essenciais e admin
│   └── tables/                # Repositórios organizados por entidade
│       └── [entidade]/
│           ├── [entidade].interface.ts   # Interfaces TypeScript (IEntidadeRepository)
│           └── [entidade].repository.ts  # Implementação da classe (EntidadeRepository)
├── middlewares/
│   ├── auth.middleware.ts     # Validação de token JWT e injeção de request.user
│   └── role.middleware.ts     # Controle de acesso baseado em roles (inspectRole)
├── lib/
│   ├── hash.ts                # Funções de hash e verificação de senhas
│   └── roles.list.ts          # Constante centralizada allRoles
├── router/
│   ├── index.ts               # Registro central de prefixos de rotas
│   ├── error.schema.ts        # Schemas globais de erros HTTP (400, 401, 403, 404, 500)
│   ├── public/                # Rotas abertas (/public/login, /public/register, /public/health)
│   └── private/               # Rotas autenticadas por domínio
│       ├── account/           # Perfil e troca de senha (/account/password)
│       ├── admin/             # Operações administrativas genéricas (/admin/data/:table)
│       ├── home/              # Dashboards, menus e visões gerais por role
│       ├── manager/           # Criação e gestão de serviços e status
│       ├── service/           # Gestão e listagem de serviços
│       ├── client/            # Gestão e listagem de clientes
│       ├── NF/                # Emissão, consulta, arquivos e status de NF
│       ├── type/              # Gestão de tipos de movimentação/NF
│       └── movimentation/     # Gestão de movimentações físicas/operacionais
└── server.ts                  # Ponto de entrada da aplicação
```

### 2.2 Anatomia de um Endpoint:

Cada rota privada é dividida em arquivos com responsabilidades únicas:

1. `[nome].schemas.ts`: Schemas Zod de entrada (`params`, `querystring`, `body`) e saída (`response[status]`).
2. `[nome].options.ts`: Configurações Fastify (`rateLimit`, `schema` do Swagger associando os schemas Zod).
3. `[nome].controller.ts`: Extrai dados da `request`, chama o Use Case, trata erros HTTP e responde via `reply.status().send()`.
4. `[nome].usecase.ts`: Regra de negócio pura. Instancia e consome os repositórios, valida regras de acesso e orquestra operações.
5. `[modulo].route.ts`: Registra o verbo HTTP conectando a URL, as opções (`options`) e o controller.

---

## 3. Regras de Negócio e Segurança

### 3.1 Papéis de Usuário (RBAC / `allRoles`):

As roles são restritas e imutáveis:

- **`administrator`:** Acesso irrestrito a todos os dados, tabelas dinâmicas (`/admin/data/:table`), auditoria e configurações.
- **`manager`:** Gestão completa de clientes, serviços, movimentações e consulta de NFs.
- **`finance`:** Foco financeiro. Emissão de NFs, gestão de movimentações, consulta a serviços e status.
- **`observer`:** Apenas leitura das informações gerais permitidas.
- **`colaborator`:** Usuário de campo / técnico. **ACESSO ESTRITAMENTE RESTRITO.**

### 3.2 Regra Sagrada do Colaborador & Tabela `bundled`:

> **REGRA CRÍTICA DE PRIVACIDADE E SEGURANÇA:**

- Um usuário com papel `colaborator` **NUNCA** pode ver serviços ou dados globais da empresa.
- Serviços atribuídos a um colaborador são vinculados pela tabela `bundled` (`bundled.userId` e `bundled.serviceBundledId`).
- Toda consulta de serviços executada por colaborador deve primeiro consultar a tabela `bundled` pelo seu `userId` e filtrar **exclusivamente** os serviços cujos IDs estejam vinculados a ele.
- Consultas diretas via `servicesData.findAll()` ou filtros sem o escopo de `bundled` para colaboradores são consideradas falhas de segurança graves.

### 3.3 Notas Fiscais (NF):

- `acessKey` (Chave de Acesso): Deve conter **exatamente 44 dígitos numéricos**.
- `movimentationId`: Opcional na criação, permitindo NFs avulsas sem movimentação vinculada.
- Arquivos PDF: Upload tratado via multipart, armazenado localmente em `archives/` (ignorado no Git) e com rota de acesso autenticada `/notes/:id/file`.

### 3.4 Senhas e Primeiro Acesso:

- Usuários criados com senha provisória têm a flag `passwordChangeRequired: true`.
- Ao realizar login, essa flag é devolvida na resposta.
- O usuário deve ser obrigado a acessar `PATCH /account/password` para definir nova senha antes de continuar o fluxo normal.

---

## 4. Banco de Dados e Drizzle ORM

- **Identificadores:** Chaves primárias usam **UUIDv7** (`uuidv7()` de criação temporal ordenada).
- **Valores Monetários:** Campos de dinheiro usam `numeric("...", { precision: 10, scale: 2 })`.
    - **Atenção:** O Postgres retorna `numeric` como `string` no JavaScript para evitar erros de ponto flutuante. O Zod deve aceitar `z.union([z.string(), z.number()])` ou tratar coerções conforme o schema de resposta.
- **Datas:** Campos de data usam `date("...", { mode: "string" })` ou `timestamp("...")`. No retorno de schemas Zod, campos timestamp devolvidos pelo Drizzle são instâncias de `Date` (usar `z.date()` nos schemas de resposta ou serializar explicitamente).

---

## 5. Regras Sagradas (NUNCA QUEBRAR)

1. **PROIBIDO CRIAR ARQUIVOS DE RELATÓRIO/AVALIAÇÃO NO REPOSITÓRIO:**
    - IAs **NÃO DEVEM** gerar arquivos como `AVALIACAO-*.md`, `ANALISE-*.md`, `TESTE-*.md` ou documentações paralelas no diretório raiz sem solicitação explícita do usuário.
    - Qualquer histórico de mudanças do projeto deve ser registrado exclusivamente no arquivo `CHANGELOG.md`.

2. **COMPATIBILIDADE ESTRITA FASTIFY-TYPE-PROVIDER-ZOD:**
    - Fastify valida e serializa respostas em tempo de execução via Zod.
    - **Se o schema de resposta define `{ services: [...] }`, o controller DEVE retornar `reply.send({ services: [...] })`.** Omissões ou chaves erradas disparam `ResponseSerializationError` (Erro 500) imediato.
    - No Zod com Fastify, `.transform()` deve ser **síncrono**. Nunca use funções assíncronas dentro de transforms de validação do Fastify.

3. **USE SEMPRE O ECOSSISTEMA BUN:**
    - Execute comandos com `bun`, `bun run`, `bun test`, `bunx`. Nunca use `npm`, `yarn` ou `npx`.
    - Bun carrega `.env` automaticamente. Não instale nem invoque `dotenv`.

4. **NUNCA COMITAR DADOS SENSÍVEIS OU BINÁRIOS:**
    - Arquivos `.env`, PDFs em `archives/`, logs e caches devem permanecer permanentemente no `.gitignore`.
    - Nunca remova hashes ou desative o middleware de autenticação/auditoria.

5. **PRESERVAÇÃO DA ARQUITETURA EM CAMADAS:**
    - Não coloque queries SQL ou Drizzle diretamente dentro de Controllers ou rotas.
    - Fluxo obrigatório: **Route -> Controller -> UseCase -> Repository (Interface).**

---

## 6. Scripts e Comandos Frequentes

| Ação                               | Comando                                |
| ---------------------------------- | -------------------------------------- |
| Iniciar em Desenvolvimento         | `bun run dev` (ou `docker compose up`) |
| Iniciar em Produção                | `npm run dc:prod`                      |
| Gerar Migrations Drizzle           | `bun run db:generate`                  |
| Aplicar Migrations (Push)          | `bun run db:push`                      |
| Rodar Seed Inicial                 | `bun run db:seed`                      |
| Visualizar Banco no Drizzle Studio | `bun run db:studio`                    |
| Checagem de Tipos TypeScript       | `bun run typecheck`                    |
