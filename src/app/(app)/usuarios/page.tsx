import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEditor, resetPassword, setUserActive, updateEditor } from "@/modules/users/actions";

export default async function UsersPage() {
  await requireManager();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-4 text-xl font-semibold">Usuários</h1>
        <div className="grid gap-2">
          {users.map((person) => (
            <article key={person.id} className="rounded-lg bg-[var(--surface)] p-3 text-sm">
              <p className="font-medium">{person.name}</p>
              <p className="text-[var(--muted)]">{person.email} · {person.role} · {person.active ? "ativo" : "inativo"}</p>
              {person.role === "EDITOR" && <details id={`editor-${person.id}`} className="mt-3">
                <summary className="cursor-pointer text-base font-medium">Editar editor</summary>
                <form action={updateEditor} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={person.id}/>
                  <label>Nome<input name="name" required minLength={2} maxLength={200} defaultValue={person.name}/></label>
                  <label>E-mail<input name="email" type="email" required defaultValue={person.email}/></label>
                  <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Salvar editor</button>
                </form>
              </details>}
              {person.role !== "GESTOR_GARRO" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={setUserActive}>
                    <input type="hidden" name="id" value={person.id} />
                    <input type="hidden" name="active" value={person.active ? "false" : "true"} />
                    <button className="rounded-md border px-2 py-1">{person.active ? "Desativar" : "Ativar"}</button>
                  </form>
                  <form action={resetPassword} className="flex gap-2">
                    <input type="hidden" name="id" value={person.id} />
                    <input name="password" type="password" placeholder="Nova senha" required />
                    <button className="rounded-md border px-2 py-1">Redefinir</button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      <form action={createEditor} className="grid h-fit gap-3 rounded-lg bg-[var(--surface)] p-4">
        <h2 className="font-medium">Novo editor</h2>
        <label>Nome<input name="name" required /></label>
        <label>E-mail<input name="email" type="email" required /></label>
        <label>Senha inicial<input name="password" type="password" required minLength={8} /></label>
        <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Criar editor</button>
      </form>
    </section>
  );
}
