import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  PrismaClient,
  type AppModule,
  type DealerGroup,
  type Store,
  type StoreModule,
  type User,
  type UserStore,
  type WebsiteFeed
} from "./generated/client.js";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = `file:${path
  .resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "prisma", "dev.db")
  .replace(/\\/g, "/")}`;

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type {
  AppModule,
  DealerGroup,
  Store,
  StoreModule,
  User,
  UserStore,
  WebsiteFeed
};