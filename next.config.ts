import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp', 'adm-zip'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
}

export default nextConfig
