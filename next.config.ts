import type { NextConfig } from "next";

const basePath = (process.env.BASE_PATH || "").trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Com basePath, o otimizador pede /images sem o prefixo e recebe HTML. O arquivo público já responde.
  images: { unoptimized: true },
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
