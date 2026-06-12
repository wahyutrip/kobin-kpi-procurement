import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const env = getEnv();
  const client = postgres(env.DATABASE_URL, { max: 10 });
  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as { __kpiDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__kpiDb) {
    globalForDb.__kpiDb = createDb();
  }
  return globalForDb.__kpiDb;
}

export type { Db };
