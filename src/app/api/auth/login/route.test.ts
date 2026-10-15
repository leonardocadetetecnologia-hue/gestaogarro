import { beforeEach, describe, expect, it, vi } from "vitest";
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@/modules/auth/sign-in", () => ({ signIn }));
vi.mock("@/lib/public-path", () => ({ sessionCookiePath: () => "/gestaogarro" }));
import { POST } from "./route";
const url = "https://garroprodutora.com.br/gestaogarro/api/auth/login";
function request(body: unknown, extra: Record<string, string> = {}) {
  return new Request(url, { method: "POST", headers: { host: "garroprodutora.com.br", origin: "https://garroprodutora.com.br", "content-type": "application/json", ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
const credentials = { login: "demo.user", password: "TEST_ONLY_password", selectedRole: "ATENDENTE" };
beforeEach(() => { vi.resetAllMocks(); signIn.mockResolvedValue({ role: "ATENDENTE" }); });
describe("entrada com endpoint estável", () => {
  it("autentica sem depender de identificador de Server Action", async () => {
    const response = await POST(request(credentials));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ redirectTo: "/gestaogarro/painel" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(signIn).toHaveBeenCalledWith(credentials, false);
  });
  it("preserva a opção lembrar de mim", async () => {
    await POST(request({ ...credentials, rememberMe: true })); expect(signIn).toHaveBeenCalledWith(expect.anything(), true);
  });
  it.each(["https://outro.example", "null", ""])("bloqueia origem inválida: %s", async origin => {
    const response = await POST(request(credentials, { origin })); expect(response.status).toBe(403); expect(signIn).not.toHaveBeenCalled();
  });
  it("aceita host encaminhado pelo proxy somente quando corresponde à origem", async () => {
    const response = await POST(request(credentials, { host: "localhost:3000", "x-forwarded-host": "garroprodutora.com.br" })); expect(response.status).toBe(200);
  });
  it("rejeita corpo grande antes da autenticação", async () => {
    expect((await POST(request({ ...credentials, password: "x".repeat(9000) }))).status).toBe(413); expect(signIn).not.toHaveBeenCalled();
  });
  it("rejeita JSON malformado", async () => {
    expect((await POST(request("{"))).status).toBe(400); expect(signIn).not.toHaveBeenCalled();
  });
  it("não aceita formulário enviado de site externo", async () => {
    expect((await POST(request("login=demo.user", { "content-type": "application/x-www-form-urlencoded" }))).status).toBe(415); expect(signIn).not.toHaveBeenCalled();
  });
  it("retorna erro de credenciais sem criar redirecionamento", async () => {
    signIn.mockResolvedValue({ error: "Usuário ou senha incorretos." }); const response = await POST(request(credentials));
    expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "Usuário ou senha incorretos." });
  });
  it("não expõe erro interno", async () => {
    signIn.mockRejectedValue(new Error("PRIVATE_INTERNAL_DETAIL")); const response = await POST(request(credentials));
    expect(response.status).toBe(500); expect(await response.text()).not.toContain("PRIVATE_INTERNAL_DETAIL");
  });
});
