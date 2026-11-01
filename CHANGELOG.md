# Changelog

Registro das alterações relevantes do backend. Toda mudança de rota, contrato,
permissão, banco, produção ou auditoria deve ser adicionada aqui.

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
