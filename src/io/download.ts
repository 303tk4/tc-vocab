// エクスポートのファイル名とダウンロード（FR-IO-12）

const pad = (n: number) => String(n).padStart(2, '0')

/** tc-vocab-YYYYMMDD-HHmm.json（端末のローカル時刻） */
export function exportFileName(ext: 'json' | 'csv', date = new Date()): string {
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  const hm = `${pad(date.getHours())}${pad(date.getMinutes())}`
  return `tc-vocab-${ymd}-${hm}.${ext}`
}

export function downloadText(fileName: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  // クリック直後に破棄すると一部のブラウザでダウンロードが失敗するため遅らせる
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
