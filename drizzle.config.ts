import { defineConfig } from "drizzle-kit";

// `generate` works offline; `migrate`/`studio` need a real DATABASE_URL.
const url = process.env.DATABASE_URL ?? "postgresql://unset:unset@localhost:5432/unset";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
