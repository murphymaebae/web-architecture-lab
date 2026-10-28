import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: Next.js 16's rendering model. Every page gets a static
  // "shell" that is prerendered, and you mark the parts that are cached
  // ("use cache") or rendered per request (inside <Suspense>).
  // See docs/learning/01-web-foundation.md.
  cacheComponents: true,
  partialPrefetching: true,

  // Our shared packages (@lab/domain, @lab/content) are written in TypeScript
  // and not pre-compiled, so Next.js needs to compile them too.
  transpilePackages: ["@lab/domain", "@lab/content"],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
