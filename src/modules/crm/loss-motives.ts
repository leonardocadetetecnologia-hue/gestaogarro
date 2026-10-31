export const lossMotives = ["Preço", "Prazo", "Sumiu", "Escolheu concorrente", "Adiou / sem orçamento agora", "Outro"] as const;
export type LossMotive = (typeof lossMotives)[number];

export function lossLabel(reason: string, note = "") {
  if (reason === "Outro") return note.trim() ? `Outro: ${note.trim()}` : "Outro";
  return reason;
}
