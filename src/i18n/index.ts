import i18n, { type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { modes } from '../modes/registry'
import { readBootSettings } from '../settings/boot'
import { defaultSettings, sanitizeSettings, UI_LANGUAGES, type UiLanguage } from '../settings/types'

type Messages = Record<string, unknown>

/**
 * 共通の文言は、選んだ言語のものだけを動的 import() で読み込む（仕様書 16.8、NFR-02。版 1.55）。
 * ファイルは事前キャッシュに入るため、オフラインでも切り替えられる（12.1）
 */
const COMMON_LOADERS: Record<UiLanguage, () => Promise<{ default: Messages }>> = {
  ja: () => import('./locales/ja.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
  en: () => import('./locales/en.json'),
  vi: () => import('./locales/vi.json'),
}

/** 各モードの文言は名前空間 "mode.<modeId>" に入れる（FR-PLUG-03）。小さいため初回の JS に含める */
export const modeNamespace = (modeId: string) => `mode.${modeId}`

function buildModeResources(): Resource {
  const resources: Resource = {}
  for (const lang of UI_LANGUAGES) {
    resources[lang] = {}
    for (const mode of modes) resources[lang][modeNamespace(mode.id)] = mode.locales[lang]
  }
  return resources
}

const initialLanguage = sanitizeSettings(readBootSettings(), defaultSettings()).uiLanguage

void i18n.use(initReactI18next).init({
  resources: buildModeResources(),
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: [...UI_LANGUAGES],
  defaultNS: 'common',
  ns: ['common', ...modes.map((m) => modeNamespace(m.id))],
  interpolation: { escapeValue: false }, // React がエスケープする
  initAsync: false,
})

const loading = new Map<UiLanguage, Promise<void>>()

/** 共通の文言を読み込む。読み込み済み・読み込み中なら、それを待つだけにする */
export function loadLanguage(lang: UiLanguage): Promise<void> {
  let promise = loading.get(lang)
  if (!promise) {
    promise = COMMON_LOADERS[lang]().then((module) => {
      i18n.addResourceBundle(lang, 'common', module.default, true, true)
    })
    // 失敗したら次に呼ばれたときにもう一度試す
    promise.catch(() => loading.delete(lang))
    loading.set(lang, promise)
  }
  return promise
}

/** 文言を読み終えてから、画面の言語を切り替える（仕様書 16.8） */
export async function changeUiLanguage(lang: UiLanguage): Promise<void> {
  try {
    await loadLanguage(lang)
  } catch (error) {
    console.error('文言の読み込みに失敗しました', error)
  }
  await i18n.changeLanguage(lang)
}

/** 起動時の言語の文言。描画の前に待つ（main.tsx） */
export const i18nReady: Promise<void> = loadLanguage(initialLanguage).catch((error: unknown) =>
  console.error('文言の読み込みに失敗しました', error),
)

/** 言語名は UI 言語によらず、その言語自身の表記で表示する */
export const LANGUAGE_NAMES: Record<UiLanguage, string> = {
  ja: '日本語',
  'zh-TW': '繁體中文',
  en: 'English',
  vi: 'Tiếng Việt',
}

export default i18n
