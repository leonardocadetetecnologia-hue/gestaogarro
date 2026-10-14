import type { NextConfig } from "next";

const basePath = (process.env.BASE_PATH || "").trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
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
