FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
RUN npm ci --workspaces --if-present

FROM base AS build
COPY . .
RUN npx prisma generate --schema packages/database/prisma/schema.prisma
RUN npm run build -w @marine-cloud/web
RUN npm run build -w @marine-cloud/api

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database/prisma/dev.db ./packages/database/prisma/dev.db
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/server.js"]
