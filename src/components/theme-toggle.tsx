'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { THEME_MODES, type ThemeMode } from '@/lib/display-settings'
import { useDisplaySettings } from './theme-provider'

const ICONS: Record<ThemeMode, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

export function ThemeToggle({ className }: { className?: string }) {
  const { settings, setSettings } = useDisplaySettings()

  const cycleTheme = () => {
    const index = THEME_MODES.indexOf(settings.themeMode)
    const next = THEME_MODES[(index + 1) % THEME_MODES.length]
    setSettings(prev => ({ ...prev, themeMode: next }))
    void fetch('/api/settings/display', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, themeMode: next }),
    })
  }

  const Icon = ICONS[settings.themeMode]

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        className
      )}
      aria-label={`Theme: ${settings.themeMode}. Click to cycle dark, light, and system.`}
      title={`Theme: ${settings.themeMode}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
