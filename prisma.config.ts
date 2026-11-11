import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma لا يقرأ .env.local تلقائياً (هذا ملف Next.js)، فنحمّله هنا.
loadEnv({ path: ".env.local", override: true, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
