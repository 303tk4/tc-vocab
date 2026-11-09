// TOCFL と TBCL（臺灣華語文能力基準）の級の対応と、TOCFL パッケージの一覧の記述（仕様書 16.5）
//
// 対応の出典：國家華語測驗推動工作委員會「TOCFL 成績單新增 TBCL 對應欄位 答客問」（2021年10月修訂）の対応図
//   https://tocfl.edu.tw/assets/files/announcement/TOCFLandTBCL.pdf
// 詞語表の「第1*級」「第2*級」「第3*級」は、対応図の「1+級」「2+級」「3+級」にあたるものとして扱う（推定。README 参照）。

const TBCL_URL = 'https://coct.naer.edu.tw/page.jsp?ID=41'
const DICT_URL = 'https://dict.revised.moe.edu.tw/'
const GUIDE_URL = 'https://tocfl.edu.tw/assets/files/announcement/TOCFLandTBCL.pdf'

/** TBCL の級 → TOCFL の級の目安のタグ（その級の語が必要になる TOCFL の級） */
const levelTags = {
  第1級: 'TOCFL:入門',
  '第1*級': 'TOCFL:入門',
  第2級: 'TOCFL:入門',
  '第2*級': 'TOCFL:入門',
  第3級: 'TOCFL:基礎',
  '第3*級': 'TOCFL:基礎',
}

/** TOCFL の各級に相当する TBCL の級（聴力・閲読）。inPack はこのパッケージ（tocfl-1）が範囲とする級 */
const rows = [
  {
    tocfl: { ja: '準備級一級', 'zh-TW': '準備級一級', en: 'Novice 1' },
    cefr: '',
    listening: 'P',
    reading: '1',
    inPack: true,
  },
  {
    tocfl: { ja: '準備級二級', 'zh-TW': '準備級二級', en: 'Novice 2' },
    cefr: '',
    listening: '2',
    reading: '2',
    inPack: true,
  },
  {
    tocfl: { ja: '入門級', 'zh-TW': '入門級', en: 'Level 1' },
    cefr: 'A1',
    listening: '2+',
    reading: '2+',
    inPack: true,
    tag: 'TOCFL:入門',
  },
  {
    tocfl: { ja: '基礎級', 'zh-TW': '基礎級', en: 'Level 2' },
    cefr: 'A2',
    listening: '3+',
    reading: '3+',
    inPack: true,
    tag: 'TOCFL:基礎',
  },
  {
    tocfl: { ja: '進階級', 'zh-TW': '進階級', en: 'Level 3' },
    cefr: 'B1',
    listening: '4',
    reading: '4',
    inPack: false,
  },
  {
    tocfl: { ja: '高階級', 'zh-TW': '高階級', en: 'Level 4' },
    cefr: 'B2',
    listening: '5–6',
    reading: '5–6',
    inPack: false,
  },
  {
    tocfl: { ja: '流利級', 'zh-TW': '流利級', en: 'Level 5' },
    cefr: 'C1',
    listening: '6',
    reading: '6–7',
    inPack: false,
  },
  {
    tocfl: { ja: '精通級', 'zh-TW': '精通級', en: 'Level 6' },
    cefr: 'C2',
    listening: '7',
    reading: '7',
    inPack: false,
  },
]

/**
 * パッケージの一覧（index.json）の項目を作る。
 * id〜source は仕様書 16.5（版 1.12）の形式。updatedAt 以降は、パッケージ画面で級の対応表や出典を
 * 詳しく示すための追加の項目（仕様書への追記を提案中。README 参照）。
 */
function indexEntry({ id, file, version, updatedAt, wordCount, size, tagCounts }) {
  return {
    id,
    file,
    version,
    name: {
      ja: 'TOCFL 入門級・基礎級 対応（TBCL 第1〜3級）',
      'zh-TW': 'TOCFL 入門級・基礎級 對應（TBCL 第1〜3級）',
      en: 'TOCFL Novice–Level 2 (TBCL levels 1–3)',
    },
    description: {
      ja: 'TOCFL（華語文能力測驗）の準備級〜基礎級（A2）の目安となる語彙です。TOCFL が出題の参考にしている國家教育研究院「臺灣華語文能力基準」詞語表の第1〜3級から作りました。意味は日本語で、AI による下書きです。注音は教育部《重編國語辭典修訂本》によります。読みが確定できなかった語には「要確認:読み」のタグを付けています。辞書で確かめ、必要なら読みを直してから、このタグを外してください。',
      'zh-TW':
        '適合準備 TOCFL（華語文能力測驗）準備級至基礎級（A2）的詞彙，取自 TOCFL 命題參考的國家教育研究院「臺灣華語文能力基準」詞語表第1〜3級。釋義為日文，由 AI 草擬。注音依據教育部《重編國語辭典修訂本》。無法確定讀音的詞語標有「要確認:読み」標籤，請查閱辭典確認，必要時修正讀音後移除此標籤。',
      en: 'Vocabulary for TOCFL (Test of Chinese as a Foreign Language) Novice to Level 2 (A2), taken from levels 1–3 of the NAER Taiwan Benchmarks for the Chinese Language (TBCL) word list, which TOCFL uses as a reference. Meanings are in Japanese and were drafted by AI. Zhuyin follows the MOE Revised Mandarin Chinese Dictionary. Words whose reading could not be confirmed are tagged "要確認:読み"; check them in a dictionary, correct the reading if needed, then remove the tag.',
    },
    wordCount,
    size,
    // 一覧に示すタグ
    tags: ['TOCFL', 'TOCFL:入門', 'TOCFL:基礎'],
    meaningLanguage: 'ja',
    license:
      '語の選定と級は國家教育研究院「臺灣華語文能力基準」詞語表、注音は教育部《重編國語辭典修訂本》（創用CC 姓名標示-禁止改作 3.0 臺灣）による。意味は AI による下書き。',
    // 辞書の姓名標示は「公眾授權使用說明」の指定どおりに書く
    source:
      '國家教育研究院「臺灣華語文能力基準」三等七級詞語表（2025年4月版）https://coct.naer.edu.tw/page.jsp?ID=41 ／ 中華民國教育部（Ministry of Education, R.O.C.）。《重編國語辭典修訂本》（版本編號：2015_20260929）網址：http://dict.revised.moe.edu.tw/',
    // ここから下は追加の項目
    updatedAt,
    meaningNote: {
      ja: '意味は AI による下書き',
      'zh-TW': '釋義由 AI 草擬',
      en: 'Meanings drafted by AI',
    },
    // 単語ごとのタグの語数（TOCFL・TBCL の級と要確認）
    tagCounts: Object.fromEntries(
      Object.entries(tagCounts).filter(
        ([t]) => t.startsWith('TOCFL') || t.startsWith('TBCL') || t.startsWith('要確認'),
      ),
    ),
    levelGuide: {
      title: {
        ja: 'TOCFL と TBCL の級の対応',
        'zh-TW': 'TOCFL 與 TBCL 等級對應',
        en: 'TOCFL and TBCL levels',
      },
      note: {
        ja: 'TOCFL の各級に相当する TBCL（臺灣華語文能力基準）の級です（聴力・閲読）。「2+」は2級と3級の間を表します。このパッケージは TBCL の第1〜3級（詞語表の 1・1*・2・2*・3・3* 級）を収め、TOCFL の準備級〜基礎級にあたります。入門級までに必要な語に「TOCFL:入門」、基礎級で加わる語に「TOCFL:基礎」のタグを付けています。',
        'zh-TW':
          'TOCFL 各級相當的 TBCL（臺灣華語文能力基準）等級（聽力・閱讀）。「2+」表示介於2級與3級之間。本詞彙包收錄 TBCL 第1〜3級（詞語表 1、1*、2、2*、3、3* 級），相當於 TOCFL 準備級至基礎級。入門級所需詞彙標有「TOCFL:入門」，基礎級新增詞彙標有「TOCFL:基礎」。',
        en: 'TBCL (Taiwan Benchmarks for the Chinese Language) levels equivalent to each TOCFL level (listening / reading). "2+" lies between levels 2 and 3. This pack contains TBCL levels 1–3 (word-list levels 1, 1*, 2, 2*, 3, 3*), equivalent to TOCFL Novice to Level 2. Words needed up to Level 1 are tagged "TOCFL:入門"; words added at Level 2 are tagged "TOCFL:基礎".',
      },
      columns: {
        tocfl: { ja: 'TOCFL', 'zh-TW': 'TOCFL', en: 'TOCFL' },
        cefr: { ja: 'CEFR', 'zh-TW': 'CEFR', en: 'CEFR' },
        listening: { ja: 'TBCL（聴力）', 'zh-TW': 'TBCL（聽力）', en: 'TBCL (listening)' },
        reading: { ja: 'TBCL（閲読）', 'zh-TW': 'TBCL（閱讀）', en: 'TBCL (reading)' },
      },
      rows,
      source: {
        name: '國家華語測驗推動工作委員會「TOCFL 成績單新增 TBCL 對應欄位 答客問」（2021年10月修訂）',
        url: GUIDE_URL,
      },
    },
    sources: [
      {
        role: 'words',
        name: '國家教育研究院「臺灣華語文能力基準」三等七級詞語表（2025年4月版）',
        url: TBCL_URL,
      },
      {
        role: 'zhuyin',
        name: '教育部《重編國語辭典修訂本》（2015_20260929）',
        url: DICT_URL,
        // 姓名標示は「公眾授權使用說明」の指定どおりに書く
        attribution:
          '中華民國教育部（Ministry of Education, R.O.C.）。《重編國語辭典修訂本》（版本編號：2015_20260929）網址：http://dict.revised.moe.edu.tw/',
        license: '創用CC 姓名標示-禁止改作 3.0 臺灣',
        licenseUrl: 'https://creativecommons.org/licenses/by-nd/3.0/tw/legalcode',
        usageNoticeUrl:
          'https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/reviseddict_10312.pdf',
      },
    ],
  }
}

export const TOCFL_GUIDE = { levelTags, rows, indexEntry }
