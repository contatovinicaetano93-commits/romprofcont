import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return Response.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("Login error:", error);
    return Response.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 },
    );
  }
}
