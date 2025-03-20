const { i18n } = require('./next-i18next.config');

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
  images: {
    domains: ['naavavnfezatboofkdvr.supabase.co'],
  },
  i18n,
}

module.exports = nextConfig