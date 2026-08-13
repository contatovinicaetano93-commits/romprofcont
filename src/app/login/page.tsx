import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[hsl(222_47%_11%)] text-white">
          Carregando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
