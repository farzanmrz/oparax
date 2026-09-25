import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons", "radix-ui"],
  },
  async redirects() {
    return [
      { source: "/agents", destination: "/", permanent: true },
      { source: "/agents/:path*", destination: "/", permanent: true },
    ];
  },
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/*.ttf"],
  },
};

export default nextConfig;
