# Conector do WhatsApp (Baileys) do Hanne em container.
# Build:  docker compose build      Executar: docker compose up -d
FROM node:22-slim
ENV NODE_ENV=production DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.mjs store.mjs ./
# A sessão do WhatsApp e o diário de envios ficam no volume /data (não se perdem ao atualizar o container).
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node
CMD ["node", "server.mjs"]
