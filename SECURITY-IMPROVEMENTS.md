## CONNECT

```
ssh -i ~/.ssh/oracle-key.key ubuntu@137.131.254.117
```

# ENV

```
cd /opt/backend-pfm
sudo nano .env
```

# Melhorias de segurança

## Revisão de 2026-11-01

| #   | Severidade | Arquivo                                                                                          | Linhas                                 | Vulnerabilidade                                                                                                                                                                                                             | Confiança |
| --- | ---------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | 🟠 HIGH    | `src/middlewares/auth.middleware.ts`, `src/middlewares/role.middleware.ts`, `src/lib/jwt/jwt.ts` | 5-18                                   | Tokens JWT continuam autorizando requisições por até 30 minutos após a desativação do usuário ou alteração de sua função, porque a autorização usa apenas os dados presentes no token e não valida o estado atual no banco. | 9/10      |
| 2   | 🟡 MEDIUM  | `archives/Serviço_Prestado/*.pdf`                                                                | Histórico anterior ao commit `c17a8e0` | PDFs de notas fiscais foram expostos em commits antigos e exigiram limpeza do histórico Git.                                                                                                                                | 10/10     |

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
**Endpoint público:** `https://api.derikdev.cloud`
**Estado verificado:** backend e PostgreSQL saudáveis; `GET /public/health`
retornando HTTP 200.

A API pública passa pelo Nginx com HTTPS. O backend escuta na porta `3336`
somente em `127.0.0.1`, e o PostgreSQL permanece privado no Docker sem publicar
a porta `5432` no host.

## Auditoria somente leitura da VM — 2026-11-01 (verificação adicional)

A auditoria foi executada por SSH com acesso somente leitura. Nenhuma alteração
foi feita na VM.

| # | Severidade | Evidência | Problema | Confiança |
|---|---|---|---|---|
| 1 | 🟠 HIGH | Docker/host, porta TCP `3336` | A API está publicada em `0.0.0.0:3336` e aceita HTTP direto, contornando o Nginx e o HTTPS. Isso pode expor credenciais, tokens JWT e demais requisições em texto claro. | 9/10 |

### Ações recomendadas

- Remover o mapeamento público da porta `3336` no Compose de produção; ou
  vinculá-lo somente a `127.0.0.1:3336`.
- Manter o acesso externo exclusivamente pelas portas `80` e `443`, com o
  Nginx encaminhando para o backend local.
- Revisar a Security List/NSG da Oracle Cloud e remover a entrada pública de
  `3336`, mantendo somente `22`, `80` e `443` conforme a necessidade.
- Após a alteração, confirmar que `https://api.derikdev.cloud/public/health`
  continua respondendo e que `http://137.131.254.117:3336` não é acessível
  externamente.

**Status:** corrigido e confirmado novamente. O Compose de produção vincula a
porta `3336` somente a `127.0.0.1`; o backend está saudável, o endpoint HTTPS
retornou HTTP 200 e o acesso externo direto à porta falhou.

### Verificações concluídas

- Certificado HTTPS válido e renovação automática configurada.
- Autenticação SSH por senha desabilitada.
- PostgreSQL não foi identificado como externamente acessível nas portas
  comuns.

### Limitações

- A Security List/NSG da Oracle Cloud não pôde ser confirmada diretamente de
  dentro da VM.
- Não foram realizados testes autenticados de autorização.
- Valores de segredos não foram exibidos nem inspecionados.
- Não foram executados comandos destrutivos, renovação real de certificado ou
  reinicialização.
