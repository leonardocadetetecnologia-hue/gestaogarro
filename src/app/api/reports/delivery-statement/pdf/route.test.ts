import { beforeEach, describe, expect, it, vi } from "vitest";

const { session, findDemands } = vi.hoisted(() => ({ session: vi.fn(), findDemands: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: session }));
vi.mock("@/lib/prisma", () => ({ prisma: { demand: { findMany: findDemands } } }));
import { GET } from "./route";

const request = new Request("http://localhost/api/reports/delivery-statement/pdf?demandId=projeto&month=2026-11");
const deliveredAt = new Date("2026-11-18T18:30:00Z");
const demand = {
  id: "projeto", title: "Captação de exemplo", description: null, status: "ENTREGUE",
  updatedAt: deliveredAt, customer: { id: "cliente", name: "Cliente de exemplo" }, sale: null,
  deliverables: [{ id: "video", title: "Vídeo", description: "Edição e seleção.", status: "ENTREGUE", clientDeliveredAt: deliveredAt }],
};

describe("download do relatório por demanda", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    session.mockResolvedValue({ id: "editor", role: "EDITOR" });
    findDemands.mockResolvedValue([demand]);
  });

  it("entrega um PDF anexado e consulta somente entregas do editor atribuído", async () => {
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    expect(findDemands).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "projeto", deliverables: { some: { editorId: "editor", archivedAt: null } } }),
      include: expect.objectContaining({
        deliverables: expect.objectContaining({
          where: { editorId: "editor", archivedAt: null, status: { in: ["ENTREGUE", "CONCLUIDO"] }, clientDeliveredAt: { not: null } },
        }),
      }),
    }));
  });

  it("recusa sessão ausente, atendente, demanda alheia e período sem entrega", async () => {
    session.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "atendente", role: "ATENDENTE" });
    expect((await GET(request)).status).toBe(401);
    expect((await GET(request)).status).toBe(403);
    expect(findDemands).not.toHaveBeenCalled();
    findDemands.mockResolvedValueOnce([]);
    expect((await GET(request)).status).toBe(404);
    expect((await GET(new Request(request.url.replace("2026-11", "2026-10")))).status).toBe(404);
  });
});
