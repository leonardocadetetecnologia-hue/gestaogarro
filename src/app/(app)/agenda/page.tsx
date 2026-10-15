import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function AgendaPage() {
  await requireUser();
  redirect("/painel/agenda");
}
