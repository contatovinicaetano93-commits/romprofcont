import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

let dbInstance: NeonHttpDatabase<typeof schema> | undefined;

export function getDb() {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not configured");
    }
    dbInstance = drizzle(neon(url), { schema });
  }
  return dbInstance;
}
