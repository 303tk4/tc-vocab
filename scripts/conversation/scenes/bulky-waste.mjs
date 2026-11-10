// 場面：粗大ごみの回収（上級向け。仕様書 18.6）。AI（Claude）による下書き
// 申し込み方法や料金は市によって違うため、補足では具体的な金額や電話番号を書かない
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'bulky-waste',
    version: 1,
    name: '大型垃圾清運',
    level: 2,
    names: { ja: '粗大ごみの回収', en: 'Bulky waste pickup' },
  },
  phrases: [
    respond('r0089', '您好，這裡是清潔隊。', ['你好，我想預約大型垃圾清運。'], {
      ja: [
        'はい、清潔隊です。',
        ['こんにちは。粗大ごみの回収を申し込みたいのですが。'],
        '清潔隊＝市や区のごみ収集を担当する部署。粗大ごみは電話やウェブで申し込むことが多い',
      ],
      en: [
        'Hello, this is the sanitation team.',
        ["Hello, I'd like to book a bulky waste pickup."],
        '清潔隊 is the local sanitation team. Bulky waste pickups are usually booked by phone or online.',
      ],
    }),
    respond('r0090', '要丟什麼東西？', ['一張沙發跟一個床墊。', '一個舊的衣櫃。'], {
      ja: ['何を捨てますか。', ['ソファ1つとマットレス1枚です。', '古いタンス1つです。']],
      en: ['What do you want to throw away?', ['A sofa and a mattress.', 'An old wardrobe.']],
    }),
    respond('r0091', '大概多大？', ['大概兩公尺長。', '跟一般的單人床差不多。'], {
      ja: [
        'だいたいどのくらいの大きさですか。',
        ['長さ2メートルくらいです。', '普通のシングルベッドくらいです。'],
      ],
      en: ['About how big is it?', ['About two meters long.', 'About the size of a single bed.']],
    }),
    respond('r0092', '請問地址是？', ['在中山路一百號。', '我傳簡訊給你可以嗎？'], {
      ja: ['ご住所は？', ['中山路100号です。', 'ショートメッセージで送ってもいいですか。']],
      en: ["What's the address?", ['No. 100, Zhongshan Road.', 'Can I send it to you by text?']],
    }),
    respond('r0093', '我們星期三下午會去收。', ['好，謝謝。', '可以改成星期六嗎？'], {
      ja: [
        '水曜日の午後に回収に行きます。',
        ['はい、ありがとうございます。', '土曜日に変えてもらえますか。'],
      ],
      en: [
        "We'll come to collect it on Wednesday afternoon.",
        ['OK, thank you.', 'Could we change it to Saturday?'],
      ],
    }),
    respond(
      'r0094',
      '請在晚上七點前放到一樓門口。',
      ['好，我知道了。', '東西很重，可以幫忙搬下樓嗎？'],
      {
        ja: [
          '夜7時までに、1階の入り口に出しておいてください。',
          ['はい、わかりました。', '重いので、下に運ぶのを手伝ってもらえますか。'],
          '建物の中からの運び出しはしてもらえないことが多い',
        ],
        en: [
          'Please put it at the ground-floor entrance by 7 p.m.',
          ['OK, understood.', "It's heavy. Could you help carry it downstairs?"],
          "Crews usually don't carry items out of the building for you.",
        ],
      },
    ),
    respond('r0095', '床墊要先用塑膠袋包起來。', ['好，沒問題。'], {
      ja: ['マットレスは先にビニール袋で包んでください。', ['はい、大丈夫です。']],
      en: ['Please wrap the mattress in plastic first.', ['OK, no problem.']],
    }),
    respond('r0096', '電視跟冰箱要另外回收喔。', ['那要怎麼處理？'], {
      ja: [
        'テレビと冷蔵庫は、別の回収になります。',
        ['では、どうすればいいですか。'],
        '家電は販売店や回収業者に引き取ってもらうことが多い',
      ],
      en: [
        'TVs and fridges are collected separately.',
        ['Then what should I do with them?'],
        'Appliances are usually taken back by stores or recycling companies.',
      ],
    }),
    respond('r0097', '垃圾要先分類再丟。', ['好，不好意思。'], {
      ja: [
        'ごみは分別してから捨ててください。',
        ['はい、すみません。'],
        '一般のごみ・資源回收（資源ごみ）・廚餘（生ごみ）に分けることが多い',
      ],
      en: [
        'Please sort your rubbish before throwing it out.',
        ['OK, sorry.'],
        'Rubbish is usually sorted into general waste, recycling (資源回收) and food waste (廚餘).',
      ],
    }),

    say('s0089', ['我想預約大型垃圾清運。'], {
      ja: ['粗大ごみの回収を申し込みたい', ['粗大ごみの回収を申し込みたいです。']],
      en: ['You want to book a bulky waste pickup.', ["I'd like to book a bulky waste pickup."]],
    }),
    say('s0090', ['我要丟一張舊沙發。'], {
      ja: ['古いソファを捨てたい', ['古いソファを捨てたいです。']],
      en: ['You want to throw away an old sofa.', ['I want to throw away an old sofa.']],
    }),
    say('s0091', ['請問要收費嗎？'], {
      ja: ['料金がかかるか聞きたい', ['料金はかかりますか。']],
      en: ['You want to ask if there is a fee.', ['Is there a charge?']],
    }),
    say('s0092', ['請問哪一天可以來收？'], {
      ja: ['何日に回収に来てもらえるか聞きたい', ['何日に取りに来てもらえますか。']],
      en: [
        'You want to ask which day they can collect it.',
        ['Which day can you come to collect it?'],
      ],
    }),
    say('s0093', ['東西要放在哪裡？'], {
      ja: ['どこに出せばよいか聞きたい', ['物はどこに置けばいいですか。']],
      en: ['You want to ask where to put the items.', ['Where should I put the items?']],
    }),
    say('s0094', ['垃圾車幾點會來？'], {
      ja: [
        'ごみ収集車が何時に来るか聞きたい',
        ['ごみ収集車は何時に来ますか。'],
        '台湾では、ごみを集積所に置かず、音楽を流して来るごみ収集車に直接渡すことが多い',
      ],
      en: [
        'You want to ask what time the garbage truck comes.',
        ['What time does the garbage truck come?'],
        'In Taiwan you usually hand your rubbish directly to the garbage truck, which plays music as it arrives.',
      ],
    }),
    say('s0095', ['這個是資源回收嗎？', '這個要丟哪裡？'], {
      ja: [
        'これが資源ごみか聞きたい',
        ['これは資源ごみですか。', 'これはどこに捨てればいいですか。'],
      ],
      en: [
        'You want to ask if something is recyclable.',
        ['Is this recyclable?', 'Where should this go?'],
      ],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['s0021', 's0022', 's0023'],
}
