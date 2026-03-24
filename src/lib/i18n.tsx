'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import en from '@/locales/en.json'
import zhCN from '@/locales/zh-CN.json'
import ja from '@/locales/ja.json'
import ko from '@/locales/ko.json'
import fr from '@/locales/fr.json'
import de from '@/locales/de.json'
import es from '@/locales/es.json'

type Locale = 'en' | 'zh-CN' | 'ja' | 'ko' | 'fr' | 'de' | 'es'
type TranslationData = typeof en

const translations: Record<Locale, TranslationData> = {
  'en': en,
  'zh-CN': zhCN,
  'ja': ja,
  'ko': ko,
  'fr': fr,
  'de': de,
  'es': es,
}

const LOCALE_KEY = 'gemini_locale'

function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN'
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) return 'zh-CN'
  if (browserLang.startsWith('ja')) return 'ja'
  if (browserLang.startsWith('ko')) return 'ko'
  if (browserLang.startsWith('fr')) return 'fr'
  if (browserLang.startsWith('de')) return 'de'
  if (browserLang.startsWith('es')) return 'es'
  if (browserLang.startsWith('en')) return 'en'
  return 'zh-CN'
}

function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(LOCALE_KEY)
  if (stored && stored in translations) return stored as Locale
  return null
}

function getInitialLocale(): Locale {
  const stored = getStoredLocale()
  if (stored) return stored
  return getBrowserLocale()
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(LOCALE_KEY, newLocale)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: unknown = translations[locale]
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    if (typeof value !== 'string') return key
    if (!params) return value
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() ?? `{${paramKey}}`
    })
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export type { Locale }
