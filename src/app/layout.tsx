import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Nav } from '@/components/nav'

export const metadata: Metadata = {
  title: 'Grained',
  description: 'Film photography archive',
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
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
