import { z } from "zod";

export const demandMediaTypeSchema = z.enum(["VIDEO", "FOTO", "FOTO_E_VIDEO"], {
  errorMap: () => ({ message: "Informe o tipo: vídeo, foto ou foto e vídeo." }),
});

export type DemandMediaType = z.infer<typeof demandMediaTypeSchema>;
export const demandMediaTypeOptions = demandMediaTypeSchema.options;

export const demandMediaTypeLabels: Record<DemandMediaType, string> = {
  VIDEO: "Vídeo",
  FOTO: "Foto",
  FOTO_E_VIDEO: "Foto e vídeo",
};

export function isDemandMediaType(value: string): value is DemandMediaType {
  return (demandMediaTypeOptions as readonly string[]).includes(value);
}

export function demandMediaTypeLabel(value?: string | null) {
  if (!value || !isDemandMediaType(value)) return "";
  return demandMediaTypeLabels[value];
}
