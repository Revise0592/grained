import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp', 'adm-zip'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // Raise the body cap for route handlers (default 10 MB)
    middlewareClientMaxBodySize: 500 * 1024 * 1024,
  },
}

export default nextConfig
