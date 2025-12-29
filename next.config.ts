import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/erp-api/:path*',
        destination: 'https://api.isolaterp.ai/:path*',
      },
    ];
  },
};

export default nextConfig;
