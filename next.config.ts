
import type {NextConfig} from 'next';

// CORS_ALLOWED_ORIGINS is a comma-separated list of allowed origins.
// If unset, no Access-Control-Allow-Origin header is sent (same-origin only).
// For multiple origins, implement per-request CORS in middleware instead.
const corsOrigin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? null;

// Modern-browser targeting is driven by the `browserslist` field in
// package.json. Next.js 13.1+ feeds that list to SWC to skip legacy polyfills
// for browsers that don't need them (~11 KiB saving per the Lighthouse audit).
const nextConfig: NextConfig = {
  async headers() {
    const corsHeaders = corsOrigin
      ? [{ key: 'Access-Control-Allow-Origin', value: corsOrigin }]
      : [];

    return [
      {
        source: '/api/:path*',
        headers: [
          ...corsHeaders,
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, X-Request-Id, X-Idempotency-Key' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
