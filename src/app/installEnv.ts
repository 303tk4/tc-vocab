/**
 * ホーム画面への追加の手助け（FR-PWA-05、仕様書 12.1）で使う環境の判定。
 * 端末の中の情報（User-Agent など）だけで判定し、外部とは通信しない（NFR-06）。
 * User-Agent の判定は外れうるため、決めきれないときは 'unknown'（今の案内文）に戻す
 */

/**
 * - installed：追加済みのアプリとして開いている（何も示さない）
 * - ios：iPhone・iPad（共有ボタンからの手順を示す）
 * - line：LINE の中のページ（外のブラウザで開くリンクを示す）
 * - in-app：ほかのアプリの中のページ（ブラウザで開き直す手順を示す）
 * - android：Android のブラウザ（beforeinstallprompt を受けたらボタンを示す）
 * - desktop：パソコンのブラウザ（beforeinstallprompt を受けたらボタンを示す）
 * - unknown：判定できない（今の案内文）
 */
export type InstallEnv = 'installed' | 'ios' | 'line' | 'in-app' | 'android' | 'desktop' | 'unknown'

export interface InstallEnvInput {
  userAgent: string
  /** navigator.maxTouchPoints。パソコンとして名乗る iPad を見分けるのに使う */
  maxTouchPoints: number
  /** display-mode: standalone、または iOS の navigator.standalone */
  standalone: boolean
}

/** アプリの中のブラウザ（WebView）を示す User-Agent の目印 */
const IN_APP_PATTERNS = [
  /FBAN|FBAV|FB_IAB/, // Facebook・Messenger
  /Instagram/,
  /MicroMessenger/, // WeChat
  /KAKAOTALK/i,
  /\bTwitter/i,
  /TikTok|BytedanceWebview|musical_ly/i,
  /Threads/,
  /\bwv\)/, // Android の WebView
]

export function detectInstallEnv({
  userAgent: ua,
  maxTouchPoints,
  standalone,
}: InstallEnvInput): InstallEnv {
  if (standalone) return 'installed'
  // LINE のアプリ内ブラウザは「Line/13.x」を含む
  if (/\bLine\//.test(ua)) return 'line'

  const iPhoneOrIPad = /iPhone|iPad|iPod/.test(ua)
  // iPadOS 13 以降の Safari はパソコン（Macintosh）として名乗る。Mac は画面に触れられないことで見分ける
  const iPadAsMac = /Macintosh/.test(ua) && maxTouchPoints > 1
  const ios = iPhoneOrIPad || iPadAsMac

  if (IN_APP_PATTERNS.some((re) => re.test(ua))) return 'in-app'
  if (ios) {
    // iOS のブラウザ（Safari、Chrome、Firefox、Edge）は「Safari/」を含む。含まないものはアプリの中の画面
    return /Safari\//.test(ua) ? 'ios' : 'in-app'
  }
  if (/Android/.test(ua)) return 'android'
  if (/Windows NT|Macintosh|CrOS|X11; Linux/.test(ua)) return 'desktop'
  return 'unknown'
}

/** 端末の情報から判定する（ブラウザで使う） */
export function detectCurrentInstallEnv(): InstallEnv {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unknown'
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return detectInstallEnv({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone,
  })
}

/**
 * LINE で外のブラウザで開くための URL（openExternalBrowser=1 を付ける）。
 * HashRouter の「#/…」より前（検索部分）に付ける
 */
export function externalBrowserUrl(href: string): string {
  const url = new URL(href)
  url.searchParams.set('openExternalBrowser', '1')
  return url.toString()
}
