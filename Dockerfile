FROM node:22.16-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY public ./public
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production PORT=3000 STORE_DB_PATH=/app/data/sparkform.sqlite
EXPOSE 3000
CMD ["node", "server.js"]
