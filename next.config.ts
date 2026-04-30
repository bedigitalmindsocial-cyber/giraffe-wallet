import type { NextConfig } from "next";

// Pin turbopack root to this directory. Without this, Tailwind v4 can fail to
// resolve when a stray lockfile sits higher up the tree (we have several
// sibling Giraffe apps under /Downloads).
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
