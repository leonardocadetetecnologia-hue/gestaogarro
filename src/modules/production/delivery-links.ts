const hostLike = /^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i;

export function normalizeWebLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (hostLike.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function deliveryHref(value: string) {
  const normalized = normalizeWebLink(value);
  return /^https?:\/\/\S+$/i.test(normalized) ? normalized : "";
}

export function readDeliveryLinks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && deliveryHref(item) === item);
}

export function prepareDeliveryLinks(links: unknown) {
  if (!Array.isArray(links)) return links;
  return links.map(item => normalizeWebLink(typeof item === "string" ? item : String(item ?? ""))).filter(Boolean);
}
