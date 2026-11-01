# Melhorias de segurança

## Revisão de 2026-11-01

| # | Severidade | Arquivo | Linhas | Vulnerabilidade | Confiança |
|---|---|---|---|---|---|
| 1 | 🟠 HIGH | `src/middlewares/auth.middleware.ts`, `src/middlewares/role.middleware.ts`, `src/lib/jwt/jwt.ts` | 5-18 | Tokens JWT continuam autorizando requisições por até 30 minutos após a desativação do usuário ou alteração de sua função, porque a autorização usa apenas os dados presentes no token e não valida o estado atual no banco. | 9/10 |
| 2 | 🟡 MEDIUM | `archives/Serviço_Prestado/*.pdf` | Histórico anterior ao commit `c17a8e0` | PDFs removidos do snapshot atual continuam recuperáveis no histórico Git e podem expor dados fiscais e pessoais. | 10/10 |

### Revogação imediata de tokens após desativação

- **Arquivo:** middleware de autenticação
- **Categoria:** gerenciamento de sessão
- **Problema:** tokens emitidos antes da desativação de um usuário continuam válidos até expirarem.
- **Correção aplicada:** o middleware agora consulta o usuário e sua função atuais no banco em cada requisição protegida, rejeitando usuários ou funções inativos e atualizando a função usada na autorização.

### Limpeza dos PDFs no histórico Git

Os PDFs foram removidos do estado atual do repositório e novos PDFs são ignorados por `.gitignore` e `.dockerignore`. Entretanto, os arquivos continuam recuperáveis no histórico anterior ao commit `c17a8e0`.

Para tratar a exposição:

1. rotacione credenciais ou chaves eventualmente presentes nos PDFs;
2. preserve um backup seguro do repositório;
3. avise colaboradores para remover clones e referências antigas;
4. reescreva o histórico remoto e faça force push coordenado;
5. verifique os objetos remanescentes;
6. considere os dados pessoais expostos como comprometidos.

**Status:** correção de autenticação aplicada. A reescrita do histórico foi executada localmente; o push forçado para o remoto ainda requer validação e coordenação.
