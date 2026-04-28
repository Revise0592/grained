import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp', 'yauzl', 'busboy'],
  experimental: {
    middlewareClientMaxBodySize: '300mb',
  },
}

export default nextConfig
