import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse's package entry runs a debug fixture when bundled.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
