// xlsx（Office Open XML）の最小限の読み取り。依存パッケージを増やさないため自前で行う（仕様書 16.5）
// 対応するのは、1つ目のシートの文字列と数値のセルだけ。
import { inflateRawSync } from 'node:zlib'

/**
 * zip の中身をファイル名 → Buffer の Map にする。
 * 中央ディレクトリを読み、無圧縮（0）と deflate（8）に対応する。
 * @param {Buffer} buf
 * @returns {Map<string, Buffer>}
 */
export function readZip(buf) {
  // 中央ディレクトリの終端（EOCD）を末尾から探す
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('zip の形式ではありません')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const files = new Map()
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip の中央ディレクトリが壊れています')
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const lNameLen = buf.readUInt16LE(local + 26)
    const lExtraLen = buf.readUInt16LE(local + 28)
    const start = local + 30 + lNameLen + lExtraLen
    const data = buf.subarray(start, start + compSize)
    if (method === 0) files.set(name, Buffer.from(data))
    else if (method === 8) files.set(name, inflateRawSync(data))
    else throw new Error(`未対応の圧縮方式です: ${method}（${name}）`)
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

/** XML の文字参照を戻す */
export function decodeXml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return String.fromCodePoint(code)
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e]
  })
}

/** <si> の中の <t> をつなげる（ふりがな <rPh> は除く） */
function siText(si) {
  const body = si.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
  let out = ''
  for (const m of body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)) {
    out += m[1] === undefined ? '' : decodeXml(m[1])
  }
  return out
}

/** sharedStrings.xml の文字列の配列 */
export function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)].map((m) => (m[1] ? siText(m[1]) : ''))
}

/** "AB12" の列部分を 0 始まりの番号にする */
export function columnIndex(ref) {
  const letters = /^[A-Z]+/.exec(ref)[0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/**
 * シートの XML を行の配列（各行はセルの文字列の配列）にする。
 * @param {string} xml
 * @param {string[]} shared
 * @returns {string[][]}
 */
export function parseSheet(xml, shared) {
  const rows = []
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = []
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1]
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)
      const col = ref ? columnIndex(ref[1]) : row.length
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1]
      const inner = cm[2] ?? ''
      let value = ''
      if (type === 'inlineStr') {
        value = siText(inner)
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]
        if (v !== undefined) value = type === 's' ? shared[Number(v)] : decodeXml(v)
      }
      while (row.length < col) row.push('')
      row[col] = value
    }
    rows.push(row)
  }
  return rows
}

/**
 * xlsx の1つ目のシートを読む。
 * @param {Buffer} buf
 * @returns {string[][]}
 */
export function readFirstSheet(buf) {
  const files = readZip(buf)
  const sharedXml = files.get('xl/sharedStrings.xml')
  const shared = sharedXml ? parseSharedStrings(sharedXml.toString('utf8')) : []
  const sheetName = [...files.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort()[0]
  if (!sheetName) throw new Error('シートが見つかりません')
  return parseSheet(files.get(sheetName).toString('utf8'), shared)
}
