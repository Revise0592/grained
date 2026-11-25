import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Nav } from '@/components/nav'
import { AppSettingsProvider } from '@/components/app-settings-context'
import { getAuthState } from '@/lib/auth-state'
import { prisma } from '@/lib/db'
import { DEFAULT_APP_SETTINGS, mapDbAppSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Self-hosted at build time by next/font: no request to Google from the running archive.
const sans = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' })
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

export const viewport: Viewport = {
  themeColor: '#161513',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
    <html lang="en" data-palette={palette} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppSettingsProvider settings={resolvedSettings}>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] btn btn-secondary">
              Skip to content
            </a>
            <div className="min-h-screen flex flex-col">
              <Nav authEnabled={authEnabled} />
              <main id="main" className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
            </div>
          </AppSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
