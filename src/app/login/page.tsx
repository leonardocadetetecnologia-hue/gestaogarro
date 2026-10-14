"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { login } from "@/modules/auth/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const form = useForm<{ email: string; password: string }>();

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={action} className="grid w-full max-w-sm gap-4 rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <div>
          <p className="text-sm text-[var(--terra)]">Garro Produtora</p>
          <h1 className="text-2xl font-semibold">Entrar</h1>
        </div>
        <label>
          E-mail
          <input type="email" autoComplete="username" autoFocus {...form.register("email", { required: true })} />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" {...form.register("password", { required: true, minLength: 8 })} />
        </label>
        {state?.error ? <p className="text-sm text-[var(--red)]">{state.error}</p> : null}
        {form.formState.errors.password ? <p className="text-sm text-[var(--red)]">A senha tem pelo menos 8 caracteres.</p> : null}
        <button disabled={pending} className="rounded-md bg-[var(--terra)] px-4 py-2 font-medium text-white disabled:opacity-60">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
