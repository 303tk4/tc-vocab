import { describe, expect, it } from 'vitest'
import { jieyun, makeWord, tricky } from '../test/fixtures'
import { buildCsv, buildCsvTemplate, countExampleLoss, detectDelimiter, parseCsv } from './csv'
import { BOM, ImportFileError } from './parsed'

describe('buildCsv', () => {
  it('BOM・ヘッダー・CRLF 改行で出力し、特殊文字を引用符で囲む', () => {
    const csv = buildCsv([jieyun, tricky])
    expect(
      csv.startsWith(BOM + 'hanzi,zhuyin,pinyin,meaning,example,example_translation,tags\r\n'),
    ).toBe(true)
    expect(csv).toContain(
      '捷運,ㄐㄧㄝˊ ㄩㄣˋ,jié yùn,MRT（都市鉄道）,我每天坐捷運去公司。,毎日MRTで会社に行きます。,交通\r\n',
    )
    expect(csv).toContain('"言う, 話す ""say""\n2行目"')
    expect(csv).toContain('動詞;tag with space')
  })

  it('例文は1件目だけを出力し、失われる単語の数を数えられる', () => {
    const many = makeWord({ examples: [{ text: '一' }, { text: '二' }] })
    expect(countExampleLoss([jieyun, many])).toBe(1)
    expect(buildCsv([many])).not.toContain('二')
  })
})

describe('parseCsv', () => {
  it('BOM の有無・列の順序・列名の大文字小文字を問わない', () => {
    const text = 'Meaning,HANZI,tags\n言う,說,動詞; 基本 \n'
    for (const input of [text, BOM + text]) {
      const { rows } = parseCsv(input)
      expect(rows).toEqual([
        {
          position: 2,
          errors: [],
          word: {
            hanzi: '說',
            zhuyin: '',
            pinyin: '',
            meaning: '言う',
            examples: [],
            tags: ['動詞', '基本'],
          },
        },
      ])
    }
  })

  it('空行を飛ばし、エラーは行番号つきで返す', () => {
    const { rows } = parseCsv('hanzi,meaning\n茶,お茶\n\n,意味だけ\n')
    expect(rows.map((r) => [r.position, r.errors.map((e) => e.code)])).toEqual([
      [2, []],
      [4, ['required']],
    ])
  })

  it('必須の列が無ければファイル全体をエラーにする', () => {
    expect(() => parseCsv('hanzi,pinyin\n茶,chá\n')).toThrow(ImportFileError)
    try {
      parseCsv('hanzi,pinyin\n')
    } catch (e) {
      expect((e as ImportFileError).params).toEqual({ columns: 'meaning', found: 'hanzi, pinyin' })
    }
  })

  it('往復：例文が1件以下の単語は全項目が元に戻る（仕様書 9.5）', () => {
    const words = [jieyun, tricky, makeWord({ zhuyin: 'ㄗ', tags: [] })]
    const { rows } = parseCsv(buildCsv(words))
    expect(rows.every((r) => r.errors.length === 0)).toBe(true)
    const fields = ({ hanzi, zhuyin, pinyin, meaning, examples, tags }: typeof jieyun) => ({
      hanzi,
      zhuyin,
      pinyin,
      meaning,
      examples,
      tags,
    })
    expect(rows.map((r) => r.word)).toEqual(words.map(fields))
  })
})

describe('区切り文字と列の扱い（仕様書 9.2）', () => {
  it('1行目にカンマが無ければタブ、次にセミコロンで区切る', () => {
    expect(detectDelimiter('hanzi,meaning,tags\n')).toBe(',')
    expect(detectDelimiter('hanzi\tmeaning\n')).toBe('\t')
    expect(detectDelimiter('hanzi;meaning\n')).toBe(';')
    // カンマ区切りのタグ列にセミコロンがあってもカンマを優先する
    const { rows } = parseCsv('hanzi,meaning,tags\n水,water,a;b\n')
    expect(rows[0].word?.tags).toEqual(['a', 'b'])
    expect(parseCsv('hanzi\tmeaning\n水\twater\n').rows[0].word?.meaning).toBe('water')
  })

  it('知らない列と、2つ目以降の同じ名前の列は取り込まずに知らせる', () => {
    const parsed = parseCsv('hanzi,meaning,Level,memo,meaning\n水,water,1,x,y\n')
    expect(parsed.ignoredColumns).toEqual(['Level', 'memo', 'meaning'])
    expect(parsed.rows[0].word?.meaning).toBe('water')
  })

  it('テンプレートは必須の列を含み、そのまま取り込める', () => {
    const parsed = parseCsv(buildCsvTemplate())
    expect(parsed.rows.map((r) => r.word?.hanzi)).toEqual(['捷運', '好吃'])
    expect(parsed.rows.every((r) => r.errors.length === 0)).toBe(true)
    expect(parsed.ignoredColumns).toEqual([])
  })
})
