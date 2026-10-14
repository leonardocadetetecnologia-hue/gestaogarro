import { requireUser } from "@/lib/auth";
import { changeOwnPassword, updateProfile } from "@/modules/users/actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <section className="grid max-w-md gap-4">
      <h1 className="text-xl font-semibold">Meu perfil</h1>
      {params.ok ? <p className="text-sm text-[var(--green)]">Dados atualizados.</p> : null}
      <form action={updateProfile} className="grid gap-3 rounded-lg bg-[var(--surface)] p-4">
        <label>Nome<input name="name" defaultValue={user.name} required /></label>
        <p className="text-sm text-[var(--muted)]">{user.email}</p>
        <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Salvar nome</button>
      </form>
      <form action={changeOwnPassword} className="grid gap-3 rounded-lg bg-[var(--surface)] p-4">
        <label>Senha atual<input name="current" type="password" required /></label>
        <label>Nova senha<input name="next" type="password" minLength={8} required /></label>
        <button className="rounded-md border px-3 py-2">Alterar senha</button>
      </form>
    </section>
  );
}
