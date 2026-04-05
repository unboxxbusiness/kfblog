/** @type {import('next').NextConfig} */
const defaultImageHosts = ['zzpbknqpjnkjkebzetnh.supabase.co', 'kampusfilter.com']
const configuredImageHosts = String(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS || defaultImageHosts.join(','))
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    optimizePackageImports: ['lucide-react', 'recharts']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  env: {
    NEXT_PUBLIC_REVALIDATE_SECONDS: '3600'
  },
  images: {
    remotePatterns: [
      ...configuredImageHosts.map((hostname) => ({ protocol: 'https', hostname, pathname: '/**' })),
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  async redirects() {
    return [
      {
        source: '/page/:slug',
        destination: '/colleges/:slug',
        permanent: true
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: *.supabase.co",
              "connect-src 'self' *.supabase.co"
            ].join('; ')
          }
        ]
      },
      {
        source: '/colleges/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400'
          }
        ]
      },
      {
        source: '/courses/:course',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=1800, stale-while-revalidate=3600'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
