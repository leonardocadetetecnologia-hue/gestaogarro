import { describe, expect, it } from "vitest";
import { instagramUrl, whatsAppLink } from "./whatsapp";

describe("contatos clicáveis", () => {
  it("abre o WhatsApp com DDI 55 e o Instagram sem o arroba", () => {
    expect(whatsAppLink("(31) 99999-0000")).toBe("https://wa.me/5531999990000");
    expect(whatsAppLink("5531999990000")).toBe("https://wa.me/5531999990000");
    expect(whatsAppLink("123")).toBe("");
    expect(instagramUrl("@garro.produtora")).toBe("https://instagram.com/garro.produtora");
  });
});
