// 読み上げ（Web Speech API）。仕様書 FR-FC-13

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

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
