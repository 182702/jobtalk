import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Settings form uploads a logo of up to 1 MB alongside the other fields.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
