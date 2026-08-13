import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log("Tabelas:", rows.map((r) => r.table_name).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
