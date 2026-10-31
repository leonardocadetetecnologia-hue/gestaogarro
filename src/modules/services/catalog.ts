import type { Prisma, PrismaClient } from "@prisma/client";
import type { ServiceCategory, ServicePriceType, ServiceRecurrence, ServiceSnapshot } from "./model";

export const SERVICE_CATALOG_KEY = "services.catalog";

type SeedService = ServiceSnapshot & { code: string; sortOrder: number; deliveryDays: number | null; selectionDays: number | null };

function item(
  code: string,
  sortOrder: number,
  category: ServiceCategory,
  name: string,
  description: string,
  price: number | null,
  priceType: ServicePriceType,
  extra: Partial<SeedService> = {},
): SeedService {
  return {
    code, sortOrder, name, category, description,
    referencePrice: price, priceType,
    deliveryDays: extra.deliveryDays ?? null,
    hasSelection: extra.hasSelection ?? false,
    selectionDays: extra.selectionDays ?? null,
    recurrence: extra.recurrence ?? "UMA_VEZ",
    recurrenceDate: "",
    standardCost: null,
    variations: extra.variations ?? [],
  };
}

const video = (name: string, price: number) => ({ name, referencePrice: price });

export const garroServices: SeedService[] = [
  item("ensaio-experience-01", 1, "ENSAIOS", "Pacote 01 Experience", "2h30 de ensaio, seleção livre, 1h de consultoria de posicionamento e 1h de consultoria de conteúdo.", 3300, "FECHADO", { hasSelection: true, selectionDays: 7 }),
  item("ensaio-experience-02", 2, "ENSAIOS", "Pacote 02 Experience", "2h30 de ensaio e seleção livre, sem consultoria.", 2200, "FECHADO", { hasSelection: true, selectionDays: 7 }),
  item("ensaio-15-fotos", 3, "ENSAIOS", "15 Fotos", "1h de ensaio, 3 trocas de look e 15 fotos.", 1398, "FECHADO"),
  item("consultoria-posicionamento", 4, "ENSAIOS", "Consultoria de Posicionamento", "Consultoria avulsa, em 2 reuniões de 1h.", 1200, "FECHADO"),
  item("video-reels", 5, "ENSAIOS", "Vídeo Reels", "Vídeo no formato Reels.", 450, "FECHADO"),
  item("fast-rec", 1, "CAPTACAO", "Fast Rec", "Captação avulsa de 2h. Os valores do Plano EXP ficam no plano.", null, "FECHADO", { variations: [video("Só vídeo", 1700), video("Foto+vídeo", 2400)] }),
  item("meia-diaria", 2, "CAPTACAO", "Meia Diária", "Captação avulsa de 4h.", null, "FECHADO", { variations: [video("Só vídeo", 2500), video("Foto+vídeo", 3100)] }),
  item("diaria", 3, "CAPTACAO", "Diária", "Captação avulsa de 6 a 8h.", null, "FECHADO", { variations: [video("Só vídeo", 3600), video("Foto+vídeo", 4200)] }),
  item("evento-basico", 1, "EVENTOS", "Básico", "Fotos ou vídeos. Mínimo de 2h. O desconto progressivo vale só nas horas além das 2 primeiras.", 420, "POR_HORA"),
  item("evento-basico-2", 2, "EVENTOS", "Básico II", "Fotos e 1 Reels editado. Mínimo de 2h.", 550, "POR_HORA"),
  item("evento-rt-foto", 3, "EVENTOS", "Cobertura Fotográfica Real Time", "Captação e edição de fotos ao vivo, com entrega imediata no local.", 470, "POR_HORA", { deliveryDays: 0 }),
  item("evento-standard", 4, "EVENTOS", "Standard", "Fotos tradicionais e RT Vídeo (Mobile), com vídeo-resumo no fim do evento ou no dia seguinte.", 680, "POR_HORA"),
  item("evento-premium", 5, "EVENTOS", "Premium", "RT Foto e RT Vídeo (Mobile) combinados.", 1040, "POR_HORA"),
  item("plano-exp", 1, "PLANOS", "Plano EXP", "Assinatura de captação. O ciclo pode ser de 3 meses, 6 meses ou 1 ano. Os preços são a referência de cada captação dentro do plano.", null, "FECHADO", {
    recurrence: "TRES_MESES" satisfies ServiceRecurrence,
    variations: [video("2h · Só vídeo", 1400), video("2h · Foto+vídeo", 1900), video("4h · Só vídeo", 2200), video("4h · Foto+vídeo", 2500), video("Diária · Só vídeo", 3300), video("Diária · Foto+vídeo", 3600)],
  }),
  item("plano-master", 2, "PLANOS", "Plano Master", "3 meses, com 2 meias diárias por mês e 3h de consultoria.", 18000, "FECHADO", {
    recurrence: "TRES_MESES",
    variations: [video("3 meses", 18000), video("3x", 6200), video("Avulso", 7200)],
  }),
  item("campanha-make-foto", 1, "CAMPANHAS", "Campanha Make + Foto", "Campanha de maquiagem e foto.", null, "FECHADO"),
  item("workshop", 2, "CAMPANHAS", "Workshop", "Workshop.", null, "FECHADO"),
  item("curso-online", 1, "ESCALAVEIS", "Curso online", "Curso online.", null, "FECHADO"),
  item("presets", 2, "ESCALAVEIS", "Presets", "Presets.", null, "FECHADO"),
  item("mentoria-grupo", 3, "ESCALAVEIS", "Mentoria em grupo", "Mentoria em grupo.", null, "FECHADO"),
  item("comunidade", 4, "ESCALAVEIS", "Comunidade", "Comunidade.", null, "FECHADO"),
  item("extra-pessoa", 1, "SERVICO_EXTRA", "Pessoa adicional", "Adicional somado a um serviço principal. O valor é informado no fechamento.", null, "FECHADO"),
  item("extra-foto", 2, "SERVICO_EXTRA", "Foto excedente", "Adicional somado a um serviço principal. O valor é informado no fechamento.", null, "FECHADO"),
  item("extra-hora", 3, "SERVICO_EXTRA", "Hora excedente", "Adicional somado a um serviço principal. O valor é informado no fechamento.", null, "FECHADO"),
  item("extra-urgencia", 4, "SERVICO_EXTRA", "Taxa de urgência", "Adicional somado a um serviço principal. O valor é informado no fechamento.", null, "FECHADO"),
  item("extra-reels", 5, "SERVICO_EXTRA", "Reels extra", "Adicional somado a um serviço principal. O valor é informado no fechamento.", null, "FECHADO"),
];

type CatalogDb = Prisma.TransactionClient | PrismaClient;

export async function installGarroServices(db: CatalogDb) {
  const mark = await db.setting.findUnique({ where: { key: SERVICE_CATALOG_KEY } });
  if (mark) return;
  const existing = await db.service.count();
  if (existing === 0) {
    for (const service of garroServices) {
      await db.service.create({
        data: {
          code: service.code, name: service.name, category: service.category, description: service.description,
          referencePrice: service.referencePrice, priceType: service.priceType, deliveryDays: service.deliveryDays,
          hasSelection: service.hasSelection, selectionDays: service.selectionDays, recurrence: service.recurrence,
          standardCost: service.standardCost, sortOrder: service.sortOrder,
          variations: { create: service.variations.map((variation, index) => ({ name: variation.name, referencePrice: variation.referencePrice, sortOrder: index + 1 })) },
        },
      });
    }
  }
  await db.setting.create({ data: { key: SERVICE_CATALOG_KEY, value: "2026-10-30" } });
}
