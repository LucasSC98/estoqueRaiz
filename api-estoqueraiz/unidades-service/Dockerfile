FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY unidades-service/package*.json ./unidades-service/
COPY unidades-service/tsconfig.json ./unidades-service/
COPY unidades-service/src ./unidades-service/src

WORKDIR /build/unidades-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/unidades-service/dist ./dist
COPY --from=builder /build/unidades-service/package*.json ./
COPY --from=builder /build/unidades-service/node_modules ./node_modules

ENV NODE_PATH=/app/shared/node_modules

EXPOSE 3003

CMD ["node", "dist/unidades-service/src/index.js"]
