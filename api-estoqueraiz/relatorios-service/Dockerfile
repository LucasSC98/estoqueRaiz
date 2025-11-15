FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY relatorios-service/package*.json ./relatorios-service/
COPY relatorios-service/tsconfig.json ./relatorios-service/
COPY relatorios-service/src ./relatorios-service/src

WORKDIR /build/relatorios-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/relatorios-service/dist ./dist
COPY --from=builder /build/relatorios-service/package*.json ./
COPY --from=builder /build/relatorios-service/node_modules ./node_modules

ENV NODE_PATH=/app/shared/node_modules

EXPOSE 3007

CMD ["node", "dist/relatorios-service/src/index.js"]
