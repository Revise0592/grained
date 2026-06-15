import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Nav } from '@/components/nav'
import { StatsBar } from '@/components/stats-bar'
import { AppSettingsProvider } from '@/components/app-settings-context'
import { getAuthState } from '@/lib/auth-state'
import { prisma } from '@/lib/db'
import { DEFAULT_APP_SETTINGS, mapDbAppSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  themeColor: '#161513',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Grained',
  description: 'Film photography archive',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Grained',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [authState, appSettings] = await Promise.all([
    getAuthState(),
    prisma.appSettings.findUnique({ where: { id: 'singleton' } }),
  ])
  const authEnabled = authState === 'enabled'
  const resolvedSettings = appSettings
    ? mapDbAppSettings(appSettings)
    : DEFAULT_APP_SETTINGS
  const palette = resolvedSettings.displayPreferences.palette

  return (
    <html lang="en" data-palette={palette} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppSettingsProvider settings={resolvedSettings}>
            <div className="min-h-screen flex flex-col">
              <Nav authEnabled={authEnabled} />
              <main className="flex-1">{children}</main>
              <StatsBar />
            </div>
          </AppSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
