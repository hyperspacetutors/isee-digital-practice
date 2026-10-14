import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Allow this app to be embedded in an iframe on any site
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Remove the default SAMEORIGIN restriction so an iframe on your site can load this
          { key: "X-Frame-Options", value: "ALLOWALL" },
          // Modern CSP equivalent — allows framing from anywhere
          // Replace * with your domain (e.g. https://yoursite.com) for tighter security
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
