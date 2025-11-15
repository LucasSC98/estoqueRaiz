FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY movimentacoes-service/package*.json ./movimentacoes-service/
COPY movimentacoes-service/tsconfig.json ./movimentacoes-service/
COPY movimentacoes-service/src ./movimentacoes-service/src

WORKDIR /build/movimentacoes-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/movimentacoes-service/dist ./dist
COPY --from=builder /build/movimentacoes-service/package*.json ./
COPY --from=builder /build/movimentacoes-service/node_modules ./node_modules

ENV NODE_PATH=/app/shared/node_modules

EXPOSE 3006

CMD ["node", "dist/movimentacoes-service/src/index.js"]
