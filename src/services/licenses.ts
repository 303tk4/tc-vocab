// 権利と出典の表示（仕様書 10.3、FR-SET-07・08）

/** 著作権表示。著作者名は GitHub のアカウント名とし、本名は書かない（FR-SET-07） */
export const COPYRIGHT = '© 2026 303tk4'

/** ソースコードとライセンスの全文（GitHub のリポジトリ） */
export const REPO_URL = 'https://github.com/303tk4/tc-vocab'

/** 出典（FR-SET-08）。名前は固有名詞のため翻訳しない */
export const SOURCES = {
  vocab: {
    name: '國家教育研究院「臺灣華語文能力基準」詞語表',
    url: 'https://coct.naer.edu.tw/page.jsp?ID=41',
  },
  zhuyin: {
    name: '中華民國教育部《重編國語辭典修訂本》',
    url: 'https://dict.revised.moe.edu.tw/',
    license: '創用CC 姓名標示-禁止改作 3.0 臺灣',
    licenseUrl: 'https://creativecommons.org/licenses/by-nd/3.0/tw/',
  },
  meanings: {
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
} as const

export interface ThirdPartyLicense {
  name: string
  version: string
  license: string
  text: string
}

/** licenses.json（scripts/licenses-plugin.ts が書き出す）を検証する。形式が違えば null */
export function parseLicenses(data: unknown): ThirdPartyLicense[] | null {
  if (typeof data !== 'object' || data === null) return null
  const { format, version, packages } = data as Record<string, unknown>
  if (format !== 'tc-vocab-licenses' || version !== 1 || !Array.isArray(packages)) return null
  const isString = (v: unknown): v is string => typeof v === 'string'
  const list: ThirdPartyLicense[] = []
  for (const p of packages as unknown[]) {
    if (typeof p !== 'object' || p === null) return null
    const { name, version: v, license, text } = p as Record<string, unknown>
    if (!isString(name) || !isString(v) || !isString(license) || !isString(text)) return null
    list.push({ name, version: v, license, text })
  }
  return list
}

/** ライブラリのライセンスの一覧を読み込む。読み込めなければ例外を投げる */
export async function loadLicenses(): Promise<ThirdPartyLicense[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}licenses.json`)
  if (!res.ok) throw new Error(`licenses.json: ${res.status}`)
  const list = parseLicenses(await res.json())
  if (!list) throw new Error('licenses.json: invalid format')
  return list
}
