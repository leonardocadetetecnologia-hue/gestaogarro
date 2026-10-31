import { whatsAppLink } from "@/lib/whatsapp";

export function WhatsAppLink({ phone }: { phone: string }) {
  const href = whatsAppLink(phone);
  if (!href) return null;
  return <a className="button secondary small" href={href} target="_blank" rel="noopener noreferrer">WhatsApp</a>;
}
