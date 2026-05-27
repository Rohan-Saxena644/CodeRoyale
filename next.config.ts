import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  output: "standalone",
  serverExternalPackages: [
    "ws",
    "bufferutil",
    "utf-8-validate",
    "express",
    "socket.io",
    "socket.io-client",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
  ],
};

export default nextConfig;
