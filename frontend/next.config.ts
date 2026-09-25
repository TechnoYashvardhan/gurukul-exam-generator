import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "export",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.160.108.141",
    "192.160.108.141:3000",
    "192.160.108.158",
    "192.160.108.158:3000",
    "192.160.108.167",
    "192.160.108.167:3000",
    "192.160.108.197",
    "192.160.108.197:3000",
  ],
};

export default nextConfig;
