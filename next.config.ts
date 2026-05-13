import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  async headers() {
    const allowedOrigins = [
      'https://www.webauraindia.com',
      'https://admin.webauraindia.com',
      'https://finance.webauraindia.com',
      'https://referrals.webauraindia.com',
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS should be set at the edge in production; keeping it here helps self-hosted/Nginx.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
      // Basic CORS for API routes (if/when finance adds route handlers)
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          // Note: for strict origin reflection, implement in route handlers; this is a safe allowlist hint.
          { key: "Access-Control-Allow-Origin", value: allowedOrigins[0] },
        ],
      },
    ];
  },
};

export default nextConfig;
