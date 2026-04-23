import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grained',
    short_name: 'Grained',
    description: 'Film photography archive',
    start_url: '/',
    display: 'standalone',
    background_color: '#161513',
    theme_color: '#161513',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
