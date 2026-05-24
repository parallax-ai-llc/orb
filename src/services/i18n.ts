import i18next from 'i18next';

// Orb fork — English-only. All other locale bundles removed; no detector,
// no lazy locale loading, no language switcher.

import enTranslation from '../locales/en.json';

type TranslationDictionary = Record<string, unknown>;

export async function initI18n(): Promise<void> {
  if (i18next.isInitialized) return;

  await i18next.init({
    lng: 'en',
    resources: {
      en: { translation: enTranslation as TranslationDictionary },
    },
    supportedLngs: ['en'],
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    interpolation: { escapeValue: false },
  });

  document.documentElement.setAttribute('lang', 'en');
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options);
}

export async function changeLanguage(_lng: string): Promise<void> {
  // No-op — Orb is English-only.
  return;
}

export function getCurrentLanguage(): string {
  return 'en';
}

export function isRTL(): boolean {
  return false;
}

export function getLocale(): string {
  return 'en-US';
}

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
];
