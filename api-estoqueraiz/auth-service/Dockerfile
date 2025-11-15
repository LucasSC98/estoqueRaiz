FROM node:18-alpine AS builder

WORKDIR /build

COPY shared ./shared
WORKDIR /build/shared
RUN npm ci
RUN npm run build || true

WORKDIR /build
COPY auth-service/package*.json ./auth-service/
COPY auth-service/tsconfig.json ./auth-service/
COPY auth-service/src ./auth-service/src

WORKDIR /build/auth-service
RUN npm ci
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /build/shared/package*.json ./shared/
COPY --from=builder /build/shared/node_modules ./shared/node_modules
COPY --from=builder /build/shared/dist ./shared/dist

COPY --from=builder /build/auth-service/dist ./dist
COPY --from=builder /build/auth-service/package*.json ./
COPY --from=builder /build/auth-service/node_modules ./node_modules

ENV NODE_PATH=/app/shared/node_modules:/app/node_modules

EXPOSE 3001

CMD ["node", "dist/auth-service/src/index.js"]
