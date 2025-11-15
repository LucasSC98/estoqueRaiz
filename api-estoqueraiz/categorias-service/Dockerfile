FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY categorias-service/package*.json ./categorias-service/
COPY categorias-service/tsconfig.json ./categorias-service/
COPY categorias-service/src ./categorias-service/src

WORKDIR /build/categorias-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/categorias-service/dist ./dist
COPY --from=builder /build/categorias-service/package*.json ./
COPY --from=builder /build/categorias-service/node_modules ./node_modules

ENV NODE_PATH=/app/shared/node_modules

EXPOSE 3004

CMD ["node", "dist/categorias-service/src/index.js"]
