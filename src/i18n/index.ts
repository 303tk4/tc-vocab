import i18n, { type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { modes } from '../modes/registry'
import { readBootSettings } from '../settings/boot'
import { defaultSettings, sanitizeSettings, UI_LANGUAGES, type UiLanguage } from '../settings/types'
import en from './locales/en.json'
import ja from './locales/ja.json'
import zhTW from './locales/zh-TW.json'

const common: Record<UiLanguage, Record<string, unknown>> = { ja, 'zh-TW': zhTW, en }

/** 各モードの文言は名前空間 "mode.<modeId>" に入れる（FR-PLUG-03） */
export const modeNamespace = (modeId: string) => `mode.${modeId}`

function buildResources(): Resource {
  const resources: Resource = {}
  for (const lang of UI_LANGUAGES) {
    resources[lang] = { common: common[lang] }
    for (const mode of modes) resources[lang][modeNamespace(mode.id)] = mode.locales[lang]
  }
  return resources
}

void i18n.use(initReactI18next).init({
  resources: buildResources(),
  lng: sanitizeSettings(readBootSettings(), defaultSettings()).uiLanguage,
  fallbackLng: 'en',
  supportedLngs: [...UI_LANGUAGES],
  defaultNS: 'common',
  ns: ['common', ...modes.map((m) => modeNamespace(m.id))],
  interpolation: { escapeValue: false }, // React がエスケープする
  initAsync: false,
})

/** 言語名は UI 言語によらず、その言語自身の表記で表示する */
export const LANGUAGE_NAMES: Record<UiLanguage, string> = {
  ja: '日本語',
  'zh-TW': '繁體中文',
  en: 'English',
}

export default i18n
