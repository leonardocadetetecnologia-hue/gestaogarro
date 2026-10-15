import { beforeEach, describe, expect, it, vi } from "vitest";
const { getUser, upload } = vi.hoisted(() => ({ getUser: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: getUser }));
vi.mock("@/modules/production/attachment-service", async original => ({ ...await original<typeof import("@/modules/production/attachment-service")>(), uploadScriptAttachment: upload }));
import { POST } from "./route";
const request = (body = "Roteiro", extra: Record<string, string> = {}) => new Request("https://garro.example/api/script-attachments", {
  method: "POST", body, headers: { host: "garro.example", origin: "https://garro.example", "x-file-name": encodeURIComponent("ação.txt"), "x-deliverable-id": "task", ...extra },
});
beforeEach(() => { vi.resetAllMocks(); getUser.mockResolvedValue({ id: "manager", role: "GESTOR_GARRO" }); upload.mockResolvedValue({ id: "a", fileName: "ação.txt", size: 7, createdAt: new Date().toISOString() }); });
describe("upload HTTP autenticado", () => {
  it("rejeita sessão ausente, editor e origem divergente antes do upload", async () => {
    getUser.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
    getUser.mockResolvedValue({ role: "EDITOR" }); expect((await POST(request())).status).toBe(403);
    getUser.mockResolvedValue({ role: "GESTOR_GARRO" }); expect((await POST(request("x", { origin: "https://other.example" }))).status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });
  it("limita o corpo mesmo sem Content-Length", async () => {
    expect((await POST(request("a".repeat(10 * 1024 * 1024 + 1)))).status).toBe(413);
    expect(upload).not.toHaveBeenCalled();
  });
  it("preserva bytes e nomes acentuados e devolve somente metadados", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201); expect(upload).toHaveBeenCalledWith(expect.objectContaining({ id: "manager" }), "task", "ação.txt", Buffer.from("Roteiro"));
    expect(await response.json()).toHaveProperty("attachment.id", "a"); expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("oculta erros internos", async () => {
    upload.mockRejectedValue(new Error("private database detail")); vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request()); expect(response.status).toBe(500); expect(await response.text()).not.toContain("private database detail");
  });
});
