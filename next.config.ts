
import type {NextConfig} from 'next';

// CORS_ALLOWED_ORIGINS is a comma-separated list of allowed origins.
// If unset, no Access-Control-Allow-Origin header is sent (same-origin only).
// For multiple origins, implement per-request CORS in middleware instead.
const corsOrigin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? null;

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
