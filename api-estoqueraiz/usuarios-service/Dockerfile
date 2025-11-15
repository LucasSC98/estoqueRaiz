FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY usuarios-service/package*.json ./usuarios-service/
COPY usuarios-service/tsconfig.json ./usuarios-service/
COPY usuarios-service/src ./usuarios-service/src

WORKDIR /build/usuarios-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/usuarios-service/dist ./dist
COPY --from=builder /build/usuarios-service/package*.json ./
COPY --from=builder /build/usuarios-service/node_modules ./node_modules

ENV NODE_PATH=/app/shared/node_modules

EXPOSE 3002

CMD ["node", "dist/usuarios-service/src/index.js"]
