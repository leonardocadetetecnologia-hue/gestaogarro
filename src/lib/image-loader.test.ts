import { afterEach, describe, expect, it } from "vitest";
import imageLoader from "./image-loader";

describe("imageLoader", () => {
  const previous = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previous;
  });

  it("prefixa o caminho público quando o sistema está em um subcaminho", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/gestaogarro";
    expect(imageLoader({ src: "/images/garro-cinema-login.png", width: 640 })).toBe(
      "/gestaogarro/images/garro-cinema-login.png?w=640",
    );
  });

  it("mantém endereço absoluto", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/gestaogarro";
    expect(imageLoader({ src: "https://cdn.exemplo/foto.png", width: 640 })).toBe(
      "https://cdn.exemplo/foto.png",
    );
  });
});
