import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Nav } from '@/components/nav'
import { StatsBar } from '@/components/stats-bar'

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
    apple: '/icons/apple-touch-icon.png',
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authEnabled = !!process.env.AUTH_PASSWORD

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="min-h-screen flex flex-col">
            <Nav authEnabled={authEnabled} />
            <main className="flex-1">{children}</main>
            <StatsBar />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
