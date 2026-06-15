'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_APP_SETTINGS, type AppSettingsShape } from '@/lib/settings'

const AppSettingsContext = createContext<AppSettingsShape>(DEFAULT_APP_SETTINGS)

export function AppSettingsProvider({
  settings,
  children,
}: {
  settings: AppSettingsShape
  children: React.ReactNode
}) {
  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings(): AppSettingsShape {
  return useContext(AppSettingsContext)
}
