FROM oven/bun:1 AS development

# Define o diretório de trabalho interno
WORKDIR /usr/src/app

# Copia os arquivos de definição de dependências e trava de pacotes
COPY package.json bun.lock* ./

# Instala as dependências usando o Bun
RUN bun install

# Copia o restante do código-fonte
COPY . .

# Expõe a porta configurada
EXPOSE ${PORT:-3000}

# Comando para iniciar o servidor em desenvolvimento com hot reload
CMD ["bun", "run", "dev"]