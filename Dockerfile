# --- Этап 1: Сборка React ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Этап 2: Сервер ---
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./

# Копируем собранный React
COPY --from=client-build /app/client/build ../client/build

# Порт
EXPOSE 5000

CMD ["node", "index.js"]