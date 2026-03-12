import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    BUILD_MODE: process.env.BUILD_MODE || "0",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
