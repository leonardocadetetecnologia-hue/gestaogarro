import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
export default async function CrmPage() { await requirePermission("crm"); redirect("/painel/crm"); }
