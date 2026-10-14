import { requireManager } from "@/lib/auth";
import { timerSettings } from "@/lib/settings";
import { saveTimerSettings } from "@/modules/users/actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireManager();
  const settings = await timerSettings();
  const params = await searchParams;

  return (
    <section className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Configurações</h1>
      {params.ok ? <p className="mb-3 text-sm text-[var(--green)]">Limites atualizados.</p> : null}
      <form action={saveTimerSettings} className="grid gap-3 rounded-lg bg-[var(--surface)] p-4">
        <label>Atenção após (horas)<input name="yellowHours" type="number" min={1} defaultValue={settings.yellowHours} /></label>
        <label>Urgente após (horas)<input name="orangeHours" type="number" min={1} defaultValue={settings.orangeHours} /></label>
        <label>Atraso após (horas)<input name="redHours" type="number" min={1} defaultValue={settings.redHours} /></label>
        <button className="rounded-md bg-[var(--terra)] px-3 py-2 text-white">Salvar</button>
      </form>
    </section>
  );
}
