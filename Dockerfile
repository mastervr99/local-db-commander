FROM node:20-slim

WORKDIR /app

# 1. Installer le client Docker (indispensable pour que runQueryInSandbox puisse faire des `docker exec`)
RUN apt-get update && apt-get install -y --no-install-recommends docker.io \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. Copier les fichiers de dépendances
COPY package*.json ./

# 3. Installer les dépendances du projet
RUN npm install

# 4. Copier le code source
COPY . .

# Exposer le port SSE pour Open WebUI
EXPOSE 8000

# 5. Lancer Supergateway qui fait le pont SSE -> STDIO vers notre serveur MCP
CMD ["npx", "supergateway", "--port", "8000", "--host", "0.0.0.0", "--stdio", "npx tsx src/index.ts"]