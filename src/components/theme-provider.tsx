'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import {
  DEFAULT_DISPLAY_SETTINGS,
  type DisplaySettings,
  normalizeDisplaySettings,
} from '@/lib/display-settings'

type DisplaySettingsContextValue = {
  settings: DisplaySettings
  setSettings: React.Dispatch<React.SetStateAction<DisplaySettings>>
  loading: boolean
}

const DisplaySettingsContext = React.createContext<DisplaySettingsContextValue | undefined>(undefined)

function ThemeSync() {
  const { setTheme } = useTheme()
  const context = React.useContext(DisplaySettingsContext)

  React.useEffect(() => {
    if (!context) return
    setTheme(context.settings.themeMode)
  }, [context, setTheme])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/settings/display', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        if (!cancelled) {
          setSettings(normalizeDisplaySettings(payload))
        }
      } catch {
        // keep default dark fallback
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DisplaySettingsContext.Provider value={{ settings, setSettings, loading }}>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
        <ThemeSync />
        {children}
      </NextThemesProvider>
    </DisplaySettingsContext.Provider>
  )
}

export function useDisplaySettings() {
  const context = React.useContext(DisplaySettingsContext)
  if (!context) {
    throw new Error('useDisplaySettings must be used within ThemeProvider')
  }
  return context
}
