import { beforeEach, describe, expect, it, vi } from "vitest";
const { user } = vi.hoisted(() => ({ user: { findUnique: vi.fn(), findFirst: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user } }));
import { findLoginAccount, loginSchema } from "./credentials";
beforeEach(() => vi.resetAllMocks());
describe("acesso por nome de usuário", () => {
  it.each(["demo.gestora", "atendente@empresa", "editor@example.test"])("aceita identificador %s sem exigir formato de e-mail", login => {
    expect(loginSchema.safeParse({ login, password: "TEST_ONLY_password", selectedRole: "GESTOR_GARRO" }).success).toBe(true);
  });
  it("normaliza somente o login, preservando a senha exatamente", () => {
    const parsed = loginSchema.parse({ login: " Demo.Gestora ", password: " TEST password ", selectedRole: "GESTOR_GARRO" });
    expect(parsed.login).toBe("demo.gestora"); expect(parsed.password).toBe(" TEST password ");
  });
  it("rejeita espaços internos, login vazio e senha curta", () => {
    for (const invalid of [{ login: "a b" }, { login: "" }, { password: "short" }]) expect(loginSchema.safeParse({ login: "demo.user", password: "TEST_ONLY_password", selectedRole: "EDITOR", ...invalid }).success).toBe(false);
  });
  it("encontra a conta pelo nome de usuário", async () => {
    user.findUnique.mockResolvedValue({ id: "u", username: "demo.user" });
    await expect(findLoginAccount(" Demo.User ")).resolves.toEqual({ id: "u", username: "demo.user" });
    expect(user.findFirst).not.toHaveBeenCalled();
  });
  it("permite e-mail antigo somente para contas sem nome de usuário", async () => {
    user.findUnique.mockResolvedValue(null); user.findFirst.mockResolvedValue(null);
    await findLoginAccount("legacy@example.test");
    expect(user.findFirst).toHaveBeenCalledWith({ where: { email: "legacy@example.test", username: null } });
  });
});
