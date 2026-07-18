import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/engines", "pino", "pino-loki", "thread-stream"],
};

export default nextConfig;
