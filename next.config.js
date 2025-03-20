/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  output: 'standalone',
  // Add this images configuration
  images: {
    domains: ['naavavnfezatboofkdvr.supabase.co'],
  },
}

module.exports = nextConfig
