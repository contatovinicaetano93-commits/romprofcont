import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const ADMIN = {
  name: "Vinicius",
  email: "contato.vinicaetano93@gmail.com",
  password: "Senha@123",
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = neon(process.env.DATABASE_URL);
  const passwordHash = await bcrypt.hash(ADMIN.password, 12);

  await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${ADMIN.name}, ${ADMIN.email.toLowerCase()}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      updated_at = now()
  `;

  console.log(`Admin pronto: ${ADMIN.email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
