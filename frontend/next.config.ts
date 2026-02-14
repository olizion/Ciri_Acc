import type { NextConfig } from "next";

// Only use CDN asset prefix when explicitly deploying to production CDN
// Docker builds are NODE_ENV=production but shouldn't use the CDN
const useCdnAssets = process.env.USE_CDN_ASSETS === "true";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker deployment
  assetPrefix: useCdnAssets ? "https://dashboard.shadcnuikit.com" : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost"
      },
      {
        protocol: "https",
        hostname: "bundui-images.netlify.app"
      },
      {
        protocol: "https",
        hostname: "logo.brandfetch.io"
      }
    ]
  }
};

export default nextConfig;
