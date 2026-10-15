import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/garro-brand", () => ({ GarroBrand: () => null }));
import LoginForm from "./login-form";
import { dynamic, revalidate } from "./page";
describe("formulário de usuário", () => {
  it("exibe Usuário e usa texto sem validação de e-mail", () => {
    const html = renderToStaticMarkup(createElement(LoginForm));
    expect(html).toContain('for="login-identifier">Usuário'); expect(html).toContain('type="text"');
    expect(html).toContain('autoComplete="username"'); expect(html).not.toContain('type="email"'); expect(html).not.toContain("E-mail");
    expect(html).not.toContain("usuário ou e-mail"); expect(html).toContain("Atendente");
  });
  it("não mantém a tela de login em cache entre publicações", () => {
    expect(dynamic).toBe("force-dynamic"); expect(revalidate).toBe(0);
  });
});
