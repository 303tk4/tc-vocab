import { describe, expect, it } from 'vitest'
import { detectInstallEnv, externalBrowserUrl, type InstallEnv } from './installEnv'

const UA = {
  iPhoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iPhoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iPadOld:
    'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  lineIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0',
  lineAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 Line/14.9.0/IAB',
  instagramIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 17_5; ja_JP)',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  iOSWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
}

function detect(userAgent: string, maxTouchPoints = 0, standalone = false): InstallEnv {
  return detectInstallEnv({ userAgent, maxTouchPoints, standalone })
}

describe('ホーム画面への追加の環境の判定（FR-PWA-05）', () => {
  it.each<[string, string, number, InstallEnv]>([
    ['iPhone の Safari', UA.iPhoneSafari, 5, 'ios'],
    ['iPhone の Chrome', UA.iPhoneChrome, 5, 'ios'],
    ['古い iPad', UA.iPadOld, 5, 'ios'],
    ['パソコンとして名乗る iPad', UA.macSafari, 5, 'ios'],
    ['Mac の Safari', UA.macSafari, 0, 'desktop'],
    ['iPhone の LINE', UA.lineIOS, 5, 'line'],
    ['Android の LINE', UA.lineAndroid, 5, 'line'],
    ['iPhone の Instagram', UA.instagramIOS, 5, 'in-app'],
    ['Android の Facebook', UA.facebookAndroid, 5, 'in-app'],
    ['iOS のアプリの中の画面（Safari を名乗らない）', UA.iOSWebView, 5, 'in-app'],
    ['Android の Chrome', UA.androidChrome, 5, 'android'],
    ['Samsung Internet', UA.samsung, 5, 'android'],
    ['Windows の Chrome', UA.windowsChrome, 0, 'desktop'],
    ['Windows の Edge', UA.windowsEdge, 10, 'desktop'],
    ['Linux の Firefox', UA.linuxFirefox, 0, 'desktop'],
    ['判定できない User-Agent', 'curl/8.0', 0, 'unknown'],
    ['空の User-Agent', '', 0, 'unknown'],
  ])('%s', (_name, ua, touch, expected) => {
    expect(detect(ua, touch)).toBe(expected)
  })

  it('追加済みのアプリとして開いているときは、ほかの判定より優先する', () => {
    expect(detect(UA.iPhoneSafari, 5, true)).toBe('installed')
    expect(detect(UA.windowsChrome, 0, true)).toBe('installed')
    expect(detect(UA.lineIOS, 5, true)).toBe('installed')
  })
})

describe('LINE で外のブラウザで開く URL', () => {
  it('ハッシュより前に openExternalBrowser=1 を付ける', () => {
    expect(externalBrowserUrl('https://303tk4.github.io/tc-vocab/#/settings')).toBe(
      'https://303tk4.github.io/tc-vocab/?openExternalBrowser=1#/settings',
    )
  })

  it('既にある検索部分は残し、重ねて付けない', () => {
    expect(externalBrowserUrl('https://example.test/tc-vocab/?a=1&openExternalBrowser=1#/')).toBe(
      'https://example.test/tc-vocab/?a=1&openExternalBrowser=1#/',
    )
  })
})
