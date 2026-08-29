import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 loads this config for all CLI commands. A placeholder URL allows
// format/validate/generate on machines without PostgreSQL. Migrate and seed
// require a real DATABASE_URL pointing to a running database.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@127.0.0.1:5432/setareganplus?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
