import { GarroProvider } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { loadPanelState } from "@/modules/painel/state";
import "./garro-app.css";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const state = await loadPanelState(user);
  return (
    <GarroProvider role={user.role} userName={user.name} userId={user.id} initialState={state}>
      {children}
    </GarroProvider>
  );
}
