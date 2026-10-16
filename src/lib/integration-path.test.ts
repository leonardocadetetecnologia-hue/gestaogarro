import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { isIntegrationEventsPath } from "./integration-path";

const previous = process.env.BASE_PATH;

afterEach(() => {
  if (previous === undefined) delete process.env.BASE_PATH;
  else process.env.BASE_PATH = previous;
});

function request(pathname: string, cookie = false) {
  const headers = cookie ? { cookie: "garro_session=sessao" } : undefined;
  return new NextRequest(new URL(pathname, "https://exemplo.test"), { headers });
}

describe("caminho do feed", () => {
  it("reconhece a rota com e sem basePath e rejeita o restante da API", () => {
    expect(isIntegrationEventsPath("/api/integrations/events", "")).toBe(true);
    expect(isIntegrationEventsPath("/gestaogarro/api/integrations/events", "/gestaogarro")).toBe(true);
    expect(isIntegrationEventsPath("/api/integrations/events/outro", "/gestaogarro")).toBe(false);
    expect(isIntegrationEventsPath("/api/health", "/gestaogarro")).toBe(false);
    expect(isIntegrationEventsPath("/gestaogarro/api/crm", "/gestaogarro")).toBe(false);
  });

  it("deixa o feed passar sem cookie e continua protegendo o restante", () => {
    process.env.BASE_PATH = "/gestaogarro";
    expect(middleware(request("/api/integrations/events")).headers.get("location")).toBeNull();
    expect(middleware(request("/gestaogarro/api/integrations/events")).headers.get("location")).toBeNull();
    expect(middleware(request("/crm")).headers.get("location")).toContain("/login");
    expect(middleware(request("/api/integrations/events/extra")).headers.get("location")).toContain("/login");
    expect(middleware(request("/crm", true)).headers.get("location")).toBeNull();
  });
});
