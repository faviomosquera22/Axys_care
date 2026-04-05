import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: [
    "@axyscare/core-catalogs",
    "@axyscare/core-clinical",
    "@axyscare/core-db",
    "@axyscare/core-types",
    "@axyscare/core-validation",
    "@axyscare/ui-shared",
  ],
  turbopack: {
    root: path.join(currentDir, "../.."),
  },
};

export default nextConfig;
