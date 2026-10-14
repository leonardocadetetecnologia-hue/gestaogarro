export function formatBRL(value: string | number | null | undefined) {
  if (value == null || value === "") return "Valor não definido";
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(number)) return "Valor não definido";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
}

export function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return Number.NaN;
  return number;
}
