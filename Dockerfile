FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
RUN npm ci

FROM base AS builder
COPY . .
RUN npx prisma generate --schema packages/database/prisma/schema.prisma
RUN npm run build -w @marine-cloud/web
RUN npm run build -w @marine-cloud/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
