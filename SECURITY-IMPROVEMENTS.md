# Melhorias de segurança

## Revisão de 2026-11-01

| # | Severidade | Arquivo | Linhas | Vulnerabilidade | Confiança |
|---|---|---|---|---|---|
| 1 | 🟠 HIGH | `src/middlewares/auth.middleware.ts`, `src/middlewares/role.middleware.ts`, `src/lib/jwt/jwt.ts` | 5-18 | Tokens JWT continuam autorizando requisições por até 30 minutos após a desativação do usuário ou alteração de sua função, porque a autorização usa apenas os dados presentes no token e não valida o estado atual no banco. | 9/10 |
| 2 | 🟡 MEDIUM | `archives/Serviço_Prestado/*.pdf` | Histórico anterior ao commit `c17a8e0` | PDFs de notas fiscais foram expostos em commits antigos e exigiram limpeza do histórico Git. | 10/10 |

### Revogação imediata de tokens após desativação

- **Arquivo:** middleware de autenticação
- **Categoria:** gerenciamento de sessão
- **Problema:** tokens emitidos antes da desativação de um usuário continuam válidos até expirarem.
- **Correção aplicada:** o middleware agora consulta o usuário e sua função atuais no banco em cada requisição protegida, rejeitando usuários ou funções inativos e atualizando a função usada na autorização.

### Limpeza dos PDFs no histórico Git

Os PDFs foram removidos do estado atual e do histórico remoto de `main` e `dev`. Novos PDFs são ignorados por `.gitignore` e `.dockerignore`.

Para tratar a exposição:

1. rotacione credenciais ou chaves eventualmente presentes nos PDFs;
2. preserve um backup seguro do repositório;
3. avise colaboradores para remover clones e referências antigas;
4. reescreva o histórico remoto e faça force push coordenado;
5. verifique os objetos remanescentes;
6. considere os dados pessoais expostos como comprometidos.

**Status:** correção de autenticação aplicada. O histórico remoto foi reescrito e verificado sem PDFs alcançáveis.

## Deploy atual em produção

**Ambiente:** Oracle Cloud VM
**Endpoint temporário:** `http://137.131.254.117:3336`
**Estado verificado:** backend e PostgreSQL saudáveis; `GET /public/health` retornando HTTP 200.

Para testes iniciais, a API está acessível diretamente por HTTP e a porta `3336`
está publicada. O PostgreSQL permanece privado no Docker e não publica a porta
`5432` no host.

### Riscos aceitos temporariamente para testes

- A API ainda não usa HTTPS.
- A porta `3336` está exposta diretamente.
- O CORS está permissivo no ambiente de testes.

Antes de liberar o frontend em produção, configurar HTTPS com proxy reverso,
restringir `CORS_ORIGIN` ao domínio real do frontend e fechar o acesso externo
direto à porta `3336`.
