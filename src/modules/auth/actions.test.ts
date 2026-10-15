import { beforeEach, describe, expect, it, vi } from "vitest";
const { mocks } = vi.hoisted(() => ({ mocks: {
  find: vi.fn(), compare: vi.fn(), audit: vi.fn(), createSession: vi.fn(),
  clear: vi.fn(), failure: vi.fn(), limited: vi.fn(), sessions: vi.fn(), redirect: vi.fn(),
} }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/prisma", () => ({ prisma: { session: { deleteMany: mocks.sessions } } }));
vi.mock("@/lib/auth", () => ({ clearAttempts: mocks.clear, createSession: mocks.createSession, destroySession: vi.fn(), registerFailure: mocks.failure, tooManyAttempts: mocks.limited }));
vi.mock("./credentials", async importOriginal => ({ ...await importOriginal<typeof import("./credentials")>(), findLoginAccount: mocks.find }));
import { login } from "./actions";
const account = { id: "u", role: "GESTOR_GARRO", active: true, passwordHash: "TEST_HASH" };
function form(role = "GESTOR_GARRO") {
  const data = new FormData(); data.set("login", "Demo.User"); data.set("password", "TEST_ONLY_password"); data.set("selectedRole", role); return data;
}
beforeEach(() => { vi.resetAllMocks(); mocks.find.mockResolvedValue(account); mocks.compare.mockResolvedValue(true); });
describe("autenticação e perfil", () => {
  it("cria sessão somente após validar senha e perfil", async () => {
    await login(undefined, form());
    expect(mocks.find).toHaveBeenCalledWith("demo.user"); expect(mocks.createSession).toHaveBeenCalledWith("u", false);
    expect(mocks.redirect).toHaveBeenCalledWith("/painel");
  });
  it.each(["ATENDENTE", "EDITOR"])("nega login em perfil diferente: %s", async role => {
    const result = await login(undefined, form(role)); expect(result?.error).toContain("perfil"); expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("nega senha incorreta e registra a tentativa", async () => {
    mocks.compare.mockResolvedValue(false); expect((await login(undefined, form()))?.error).toContain("incorretos");
    expect(mocks.failure).toHaveBeenCalledWith("demo.user"); expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("nega conta inativa", async () => {
    mocks.find.mockResolvedValue({ ...account, active: false }); await login(undefined, form()); expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("respeita o limite de tentativas antes de consultar a conta", async () => {
    mocks.limited.mockReturnValue(true); expect((await login(undefined, form()))?.error).toContain("tentativas"); expect(mocks.find).not.toHaveBeenCalled();
  });
});
