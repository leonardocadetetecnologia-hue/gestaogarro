export function whatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return "";
  return `https://wa.me/${withCountry}`;
}

export function instagramUrl(handle: string) {
  const name = handle.trim().replace(/^@+/, "");
  if (!name) return "";
  return `https://instagram.com/${encodeURIComponent(name)}`;
}
