import type { MetadataRoute } from 'next'
import { getSettings } from '@/lib/server-settings'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings()

  return {
    name: settings.metadata.appName,
    short_name: settings.metadata.appName,
    description: settings.metadata.appDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#161513',
    theme_color: '#161513',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
