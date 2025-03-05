import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // API routes configuration
  async rewrites() {
    return [
      {
        // Proxy API requests to the backend
        source: "/api/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
