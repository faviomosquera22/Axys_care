import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@axyscare/core-catalogs",
    "@axyscare/core-clinical",
    "@axyscare/core-db",
    "@axyscare/core-types",
    "@axyscare/core-validation",
    "@axyscare/ui-shared",
  ],
};

export default nextConfig;

