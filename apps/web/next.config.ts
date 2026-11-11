import path from "node:path";
import type { NextConfig } from "next";

// The monorepo root: npm workspaces hoist node_modules there, and the
// shared packages live beside this app.
const workspaceRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  outputFileTracingRoot: workspaceRoot,
  // Shared workspace packages ship TypeScript source.
  transpilePackages: ["@readers-choice/core", "@readers-choice/contract"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
