import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output only when explicitly requested (e.g. Docker build), NOT on Vercel
  output: process.env.VERCEL ? undefined : (process.env.BUILD_STANDALONE ? "standalone" : undefined),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
