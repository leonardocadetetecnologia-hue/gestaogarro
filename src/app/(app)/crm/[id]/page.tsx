import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
export default async function CrmDetail({params}:{params:Promise<{id:string}>}) { await requirePermission("crm"); const {id}=await params; redirect(`/painel/crm?o=${encodeURIComponent(id)}`); }
