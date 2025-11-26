FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY produtos-service/package*.json ./produtos-service/
COPY produtos-service/tsconfig.json ./produtos-service/
COPY produtos-service/src ./produtos-service/src

WORKDIR /build/produtos-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/produtos-service/dist ./dist
COPY --from=builder /build/produtos-service/package*.json ./
COPY --from=builder /build/produtos-service/node_modules ./node_modules

RUN mkdir -p /app/uploads

ENV NODE_PATH=/app/shared/node_modules

EXPOSE 3005

CMD ["node", "dist/produtos-service/src/index.js"]
