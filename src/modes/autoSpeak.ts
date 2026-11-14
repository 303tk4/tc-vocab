// 音声の自動再生（仕様書 7.2 FR-PLUG-09、8.2 FR-FC-14、18.3 FR-CONV-10）。React から独立した純粋な処理

/**
 * 保存キー（ModeSettingsStore が "mode.<modeId>." を付ける）。
 * 暗記カードの版 1.47 までのモード設定「裏返したときに自動で読み上げる」と同じキーなので、値を引き継げる
 */
export const AUTO_SPEAK_KEY = 'autoSpeak'

/** 使う値を決める。保存した値が真偽値ならそれ、無ければモードの初期値 */
export function resolveAutoSpeak(saved: unknown, defaultValue: boolean): boolean {
  return typeof saved === 'boolean' ? saved : defaultValue
}
