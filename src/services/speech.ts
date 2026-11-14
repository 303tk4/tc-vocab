// 読み上げ（Web Speech API）。仕様書 FR-FC-13

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * 読み上げを使えるようにしておく（FR-PLUG-09）。iPhone の Safari などは、利用者が押した操作の中で
 * 一度も読み上げていないと、あとから自動で読み上げられない。「学習を始める」を押したときに、
 * 音の出ない読み上げを一度してから学習を始める
 */
export function unlockSpeech(): void {
  if (!canSpeak) return
  const utterance = new SpeechSynthesisUtterance(' ')
  utterance.volume = 0
  window.speechSynthesis.speak(utterance)
}

export function speak(text: string): void {
  if (!canSpeak || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-TW'
  const voice = synth.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase() === 'zh-tw')
  if (voice) utterance.voice = voice
  synth.speak(utterance)
}
