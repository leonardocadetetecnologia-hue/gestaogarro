import { describe, expect, it, vi } from "vitest";
import { garroServices, installGarroServices, SERVICE_CATALOG_KEY } from "./catalog";

describe("catálogo inicial da Garro", () => {
  it("traz ensaios, captação, eventos, planos, campanhas, escaláveis e extras", () => {
    const byCode = Object.fromEntries(garroServices.map((item) => [item.code, item]));
    expect(byCode["ensaio-experience-01"]).toMatchObject({ referencePrice: 3300, hasSelection: true, selectionDays: 7 });
    expect(byCode["ensaio-experience-02"].referencePrice).toBe(2200);
    expect(byCode["ensaio-15-fotos"].hasSelection).toBe(false);
    expect(byCode["fast-rec"].variations.map((item) => item.referencePrice)).toEqual([1700, 2400]);
    expect(byCode["meia-diaria"].variations.map((item) => item.referencePrice)).toEqual([2500, 3100]);
    expect(byCode["diaria"].variations.map((item) => item.referencePrice)).toEqual([3600, 4200]);
    expect(byCode["evento-basico"]).toMatchObject({ referencePrice: 420, priceType: "POR_HORA" });
    expect(byCode["evento-rt-foto"]).toMatchObject({ referencePrice: 470, deliveryDays: 0 });
    expect(byCode["evento-premium"].referencePrice).toBe(1040);
    expect(byCode["plano-exp"]).toMatchObject({ referencePrice: null, recurrence: "TRES_MESES" });
    expect(byCode["plano-exp"].variations.map((item) => [item.name, item.referencePrice])).toEqual([
      ["2h · Só vídeo", 1400], ["2h · Foto+vídeo", 1900], ["4h · Só vídeo", 2200], ["4h · Foto+vídeo", 2500], ["Diária · Só vídeo", 3300], ["Diária · Foto+vídeo", 3600],
    ]);
    expect(byCode["plano-master"].referencePrice).toBe(18000);
    expect(byCode["plano-master"].variations.map((item) => item.referencePrice)).toEqual([18000, 6200, 7200]);
    for (const code of ["campanha-make-foto", "workshop", "curso-online", "presets", "mentoria-grupo", "comunidade", "extra-pessoa", "extra-foto", "extra-hora", "extra-urgencia", "extra-reels"]) {
      expect(byCode[code].referencePrice).toBeNull();
    }
    expect(garroServices.filter((item) => item.category === "SERVICO_EXTRA")).toHaveLength(5);
  });

  it("grava o catálogo uma vez e não recria depois que a Gestora apaga serviços", async () => {
    const db = { setting: { findUnique: vi.fn(), create: vi.fn() }, service: { count: vi.fn(), create: vi.fn() } };
    db.setting.findUnique.mockResolvedValueOnce({ key: SERVICE_CATALOG_KEY, value: "2026-10-30" });
    await installGarroServices(db as never);
    expect(db.service.create).not.toHaveBeenCalled();

    db.setting.findUnique.mockResolvedValueOnce(null);
    db.service.count.mockResolvedValueOnce(0);
    await installGarroServices(db as never);
    expect(db.service.create).toHaveBeenCalledTimes(garroServices.length);
    expect(db.setting.create).toHaveBeenCalledWith({ data: { key: SERVICE_CATALOG_KEY, value: "2026-10-30" } });

    db.setting.findUnique.mockResolvedValueOnce(null);
    db.service.count.mockResolvedValueOnce(3);
    await installGarroServices(db as never);
    expect(db.service.create).toHaveBeenCalledTimes(garroServices.length);
  });
});
