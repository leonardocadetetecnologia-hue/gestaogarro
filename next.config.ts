import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs", "prisma"],
  poweredByHeader: false,
};

export default nextConfig;
