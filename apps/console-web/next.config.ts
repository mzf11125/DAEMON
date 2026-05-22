import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@daemon/sdk-ts", "@daemon/shared-types"],
};

export default nextConfig;
