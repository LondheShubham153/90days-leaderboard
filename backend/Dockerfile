FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json schema.json ./
COPY src ./src
USER node
# AppSail health-checks X_ZOHO_CATALYST_LISTEN_PORT (default 9000); EXPOSE is documentation only.
EXPOSE 9000
CMD ["node", "src/server.js"]
