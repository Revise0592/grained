import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Nav } from '@/components/nav'
import { StatsBar } from '@/components/stats-bar'
import { getSettings } from '@/lib/server-settings'

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  themeColor: '#161513',
  width: 'device-width',
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()

  return {
    title: settings.metadata.appName,
    description: settings.metadata.appDescription,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: settings.metadata.appName,
    },
    icons: {
      icon: [
        { url: '/icons/icon.svg', type: 'image/svg+xml' },
        { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authEnabled = !!process.env['AUTH_PASSWORD']
  const settings = await getSettings()

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme={settings.display.defaultTheme} enableSystem>
          <div className="min-h-screen flex flex-col">
            <Nav authEnabled={authEnabled} appName={settings.metadata.appName} />
            <main className="flex-1">{children}</main>
            <StatsBar visible={settings.display.showStatsBar} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
