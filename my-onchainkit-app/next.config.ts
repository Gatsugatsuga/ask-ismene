import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs");
    return config;
  },
};

export default nextConfig;
