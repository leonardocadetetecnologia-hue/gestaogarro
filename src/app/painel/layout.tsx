import { GarroProvider } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import "./garro-app.css";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <GarroProvider role={user.role} userName={user.name}>
      {children}
    </GarroProvider>
  );
}
