// 場面：ドリンクスタンド（仕様書 18.6）。AI（Claude）による下書き
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'drink-stand',
    version: 1,
    name: '飲料店',
    level: 1,
    names: { ja: 'ドリンクスタンド', en: 'Drink stand' },
  },
  phrases: [
    respond('r0038', '要喝什麼？', ['我要一杯珍珠奶茶。', '我再看一下。'], {
      ja: ['何になさいますか。', ['タピオカミルクティーを1つ。', 'もう少し見ます。']],
      en: ['What would you like to drink?', ["I'd like a bubble milk tea.", "I'm still looking."]],
    }),
    respond('r0039', '甜度冰塊呢？', ['半糖少冰。', '無糖去冰。'], {
      ja: [
        '甘さと氷の量はどうしますか。',
        ['甘さ半分、氷少なめで。', '甘さなし、氷なしで。'],
        '甜度（甘さ）：全糖・少糖・半糖・微糖・無糖。冰塊（氷）：正常冰・少冰・微冰・去冰。ほかに溫（ぬるめ）・熱（ホット）も選べる',
      ],
      en: [
        'Sugar level and ice?',
        ['Half sugar, less ice.', 'No sugar, no ice.'],
        'Sugar: 全糖 full, 少糖 less, 半糖 half, 微糖 a little, 無糖 none. Ice: 正常冰 regular, 少冰 less, 微冰 a little, 去冰 none. You can also ask for 溫 (warm) or 熱 (hot).',
      ],
    }),
    respond('r0040', '要加料嗎？', ['加珍珠。', '不用。'], {
      ja: ['トッピングを追加しますか。', ['タピオカを入れてください。', '要りません。']],
      en: ['Would you like any toppings?', ['Add tapioca pearls.', 'No, thanks.']],
    }),
    respond('r0041', '加珍珠要多十塊喔。', ['好，沒關係。'], {
      ja: ['タピオカを入れると10元追加です。', ['はい、大丈夫です。']],
      en: ['Pearls are 10 dollars extra.', ["OK, that's fine."]],
    }),
    respond('r0042', '要幫你插吸管嗎？', ['好，謝謝。', '不用，我等一下再喝。'], {
      ja: ['ストローを刺しましょうか。', ['はい、お願いします。', 'いいえ、あとで飲みます。']],
      en: ['Shall I put the straw in for you?', ['Yes, thanks.', "No, I'll drink it later."]],
    }),
    respond('r0043', '有帶環保杯嗎？', ['沒有。', '有，用這個。'], {
      ja: [
        'マイカップをお持ちですか。',
        ['ありません。', 'はい、これでお願いします。'],
        '自分のカップを持っていくと割引になる店が多い',
      ],
      en: [
        'Did you bring your own cup?',
        ["No, I didn't.", 'Yes, please use this one.'],
        'Many shops give a discount if you bring your own cup.',
      ],
    }),
    respond('r0044', '這是您的號碼牌，好了會叫號。', ['好，謝謝。'], {
      ja: ['こちらは番号札です。できたら番号でお呼びします。', ['はい、ありがとう。']],
      en: ["Here's your number. We'll call it when it's ready.", ['OK, thank you.']],
    }),
    respond('r0045', '八十三號，好了喔！', ['是我，謝謝。'], {
      ja: ['83番の方、できました。', ['私です、ありがとう。']],
      en: ['Number 83, your order is ready!', ["That's me, thanks."]],
    }),
    respond('r0046', '要幾杯？', ['兩杯。', '一杯就好。'], {
      ja: ['何杯ですか。', ['2杯です。', '1杯で。']],
      en: ['How many cups?', ['Two.', 'Just one.']],
    }),

    say('s0040', ['我要一杯珍珠奶茶，半糖少冰。'], {
      ja: [
        'タピオカミルクティーを、甘さ半分・氷少なめで頼みたい',
        ['タピオカミルクティーを1つ、甘さ半分、氷少なめで。'],
      ],
      en: [
        'You want a bubble milk tea with half sugar and less ice.',
        ['One bubble milk tea, half sugar, less ice.'],
      ],
    }),
    say('s0041', ['無糖去冰。', '我要無糖，去冰。'], {
      ja: [
        '甘さなし・氷なしにしてほしい',
        ['甘さなし、氷なしで。', '甘さなしで、氷は抜いてください。'],
      ],
      en: [
        'You want it with no sugar and no ice.',
        ['No sugar, no ice.', 'No sugar, and no ice please.'],
      ],
    }),
    say('s0042', ['我要熱的。', '可以做熱的嗎？'], {
      ja: ['温かい飲み物にしたい', ['ホットでお願いします。', 'ホットにできますか。']],
      en: ['You want your drink hot.', ["I'd like it hot.", 'Can you make it hot?']],
    }),
    say('s0043', ['甜度有哪些？', '半糖大概多甜？'], {
      ja: [
        '甘さの選び方を聞きたい',
        ['甘さはどんな種類がありますか。', '半糖はどのくらい甘いですか。'],
      ],
      en: [
        'You want to ask about the sugar levels.',
        ['What sugar levels are there?', 'How sweet is half sugar?'],
      ],
    }),
    say('s0044', ['加珍珠。', '我要加珍珠。'], {
      ja: ['タピオカを追加したい', ['タピオカを入れてください。', 'タピオカを追加します。']],
      en: ['You want to add tapioca pearls.', ['Add pearls.', "I'd like to add pearls."]],
    }),
    say('s0045', ['可以幫我插吸管嗎？'], {
      ja: ['ストローを刺してほしい', ['ストローを刺してもらえますか。']],
      en: ['You want them to put the straw in.', ['Could you put the straw in for me?']],
    }),
    say('s0046', ['有沒有不含咖啡因的？'], {
      ja: [
        'カフェインの入っていない飲み物があるか聞きたい',
        ['カフェインの入っていないものはありますか。'],
      ],
      en: [
        'You want to ask for something without caffeine.',
        ['Do you have anything caffeine-free?'],
      ],
    }),
    say('s0047', ['不好意思，可以改成去冰嗎？'], {
      ja: ['注文を「氷なし」に変えたい', ['すみません、氷なしに変えてもらえますか。']],
      en: ['You want to change your order to no ice.', ['Sorry, could I change it to no ice?']],
    }),
    say('s0048', ['大概要等多久？'], {
      ja: ['どれくらい待つか聞きたい', ['どのくらい待ちますか。']],
      en: ['You want to ask how long the wait is.', ['About how long is the wait?']],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: [
    'r0001',
    'r0015',
    'r0002',
    'r0017',
    'r0018',
    'r0010',
    'r0012',
    's0028',
    's0029',
    's0021',
    's0022',
    's0023',
  ],
}
