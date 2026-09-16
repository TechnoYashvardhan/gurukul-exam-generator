import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.160.108.158",
    "192.160.108.197",
    "192.160.*",
    "192.168.*",
    "10.*",
    "*.local",
  ],
};

export default nextConfig;
