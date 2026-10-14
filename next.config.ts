import type { NextConfig } from "next";

const basePath = (process.env.BASE_PATH || "").trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // O otimizador interno pede /images sem o basePath e recebe HTML. O loader entrega o arquivo público.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs", "prisma"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: ["cadete.tech", "www.cadete.tech"],
    },
  },
};

export default nextConfig;
