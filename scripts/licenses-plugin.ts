// ライブラリのライセンスの一覧を作る Vite プラグイン（仕様書 10.3、FR-SET-08）。
// ビルドの出力に実際に含まれたパッケージだけを集め、licenses.json として書き出す。
// 新しい依存パッケージは使わない
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

interface PackageJson {
  name?: string
  version?: string
  license?: string | { type?: string }
}

/** モジュールのパスから、node_modules の中のパッケージ名を取り出す（入れ子なら最も内側） */
export function packageNameOf(moduleId: string): string | null {
  const path = moduleId.replace(/\\/g, '/')
  const at = path.lastIndexOf('/node_modules/')
  if (at < 0) return null
  const parts = path.slice(at + '/node_modules/'.length).split('/')
  if (parts[0]?.startsWith('@')) return parts[1] ? `${parts[0]}/${parts[1]}` : null
  return parts[0] || null
}

function readLicenseText(dir: string): string {
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f))
  return file ? readFileSync(join(dir, file), 'utf8').trim() : ''
}

export function thirdPartyLicenses(root: string): Plugin {
  return {
    name: 'tc-vocab-third-party-licenses',
    apply: 'build',
    generateBundle(_options, bundle) {
      const names = new Set<string>()
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue
        for (const id of Object.keys(output.modules)) {
          const name = packageNameOf(id)
          if (name) names.add(name)
        }
      }
      const packages = [...names]
        .map((name) => {
          const dir = join(root, 'node_modules', name)
          const pkgFile = join(dir, 'package.json')
          if (!existsSync(pkgFile)) return null
          const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as PackageJson
          const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? '')
          return { name, version: pkg.version ?? '', license, text: readLicenseText(dir) }
        })
        .filter((p) => p !== null)
        .sort((a, b) => a.name.localeCompare(b.name))
      this.emitFile({
        type: 'asset',
        fileName: 'licenses.json',
        source: JSON.stringify({ format: 'tc-vocab-licenses', version: 1, packages }),
      })
    },
  }
}
