// 場面の下書きを短く書くための関数（仕様書 18.6）
// tr は言語ごとの訳：respond は [セリフの訳, 回答例の訳, 補足?]、say は [言いたいこと, 回答例の訳, 補足?]

const pack = (key, [text, answers, note]) =>
  note ? { [key]: text, answers, note } : { [key]: text, answers }

/** 答える項目（店員などのセリフに答える） */
export const respond = (id, line, answers, { ja, en }) => ({
  id,
  kind: 'respond',
  line,
  answers,
  ja: pack('line', ja),
  en: pack('line', en),
})

/** 言う項目（言いたいことを中国語で言う） */
export const say = (id, answers, { ja, en }) => ({
  id,
  kind: 'say',
  answers,
  ja: pack('intent', ja),
  en: pack('intent', en),
})
