// 場面：コンビニ（仕様書 18.6）。AI（Claude）による下書き
// 項目の ID は全場面で一意（18.5）。notInScene の項目は一覧に置くが、この場面では出題しない
export default {
  scene: {
    id: 'convenience-store',
    version: 1,
    name: '便利商店',
    level: 1,
    names: { ja: 'コンビニ', en: 'Convenience store' },
  },
  phrases: [
    {
      id: 'r0001',
      kind: 'respond',
      notInScene: true,
      line: '歡迎光臨！',
      answers: [],
      ja: {
        line: 'いらっしゃいませ。',
        answers: [],
        note: '店に入ったときに言われる。返事はしなくてよい。コンビニではあまり言われない',
      },
      en: {
        line: 'Welcome!',
        answers: [],
        note: 'Said when you enter a shop. No reply is needed.',
      },
    },
    {
      id: 'r0002',
      kind: 'respond',
      line: '需要袋子嗎？',
      answers: ['不用，謝謝。', '要，一個。'],
      ja: { line: '袋は要りますか。', answers: ['いいえ、結構です。', 'はい、1つください。'] },
      en: { line: 'Do you need a bag?', answers: ['No, thanks.', 'Yes, one please.'] },
    },
    {
      id: 'r0003',
      kind: 'respond',
      line: '袋子要另外收費喔。',
      answers: ['好，沒關係。', '那不用了。'],
      ja: {
        line: '袋は別料金です。',
        answers: ['はい、大丈夫です。', 'じゃあ、要りません。'],
        note: '台湾のレジ袋は有料（1〜2元ほど）',
      },
      en: {
        line: 'Bags cost extra.',
        answers: ["OK, that's fine.", "Then I don't need one."],
        note: 'Plastic bags cost about NT$1–2 in Taiwan.',
      },
    },
    {
      id: 'r0004',
      kind: 'respond',
      line: '有載具嗎？',
      answers: ['沒有。', '有，這個。'],
      ja: {
        line: '載具はありますか。',
        answers: ['ありません。', 'あります、これです。'],
        note: '載具：レシート（發票）を電子的に保存するバーコード。スマホの画面を見せる。旅行者は「沒有」でよい',
      },
      en: {
        line: 'Do you have a carrier?',
        answers: ["No, I don't.", 'Yes, here it is.'],
        note: 'A "carrier" (載具) is a barcode that stores your receipt electronically. Show it on your phone. Visitors can just say 沒有.',
      },
    },
    {
      id: 'r0005',
      kind: 'respond',
      line: '要打統編嗎？',
      answers: ['不用。'],
      ja: {
        line: '統一編號を入れますか。',
        answers: ['いりません。'],
        note: '統編（統一編號）：会社の番号。経費の精算に使う。個人は「不用」',
      },
      en: {
        line: 'Do you need a company tax ID on the receipt?',
        answers: ['No.'],
        note: '統編 is a company tax ID used for expense claims. Individuals answer 不用.',
      },
    },
    {
      id: 'r0006',
      kind: 'respond',
      line: '發票需要嗎？',
      answers: ['要，謝謝。', '不用，謝謝。'],
      ja: {
        line: 'レシートは要りますか。',
        answers: ['はい、ください。', 'いいえ、結構です。'],
        note: '發票（レシート）は宝くじ付き。不要ならレジ横の箱に寄付（捐發票）もできる',
      },
      en: {
        line: 'Do you need the receipt?',
        answers: ['Yes, please.', 'No, thanks.'],
        note: 'Receipts (發票) double as lottery tickets. If you don’t want it, you can donate it in the box by the register.',
      },
    },
    {
      id: 'r0007',
      kind: 'respond',
      line: '要加熱嗎？',
      answers: ['要，麻煩你。', '不用，謝謝。'],
      ja: {
        line: '温めますか。',
        answers: ['はい、お願いします。', 'いいえ、結構です。'],
        note: '弁当・おにぎり・パンなどで聞かれる',
      },
      en: {
        line: 'Would you like it heated?',
        answers: ['Yes, please.', 'No, thanks.'],
        note: 'Asked for lunch boxes, rice balls, bread and so on.',
      },
    },
    {
      id: 'r0008',
      kind: 'respond',
      line: '有會員嗎？',
      answers: ['沒有。', '有，我報手機號碼。'],
      ja: {
        line: '会員ですか。',
        answers: ['いいえ。', 'はい、携帯の番号を言います。'],
        note: '会員は携帯電話の番号で確かめることが多い',
      },
      en: {
        line: 'Are you a member?',
        answers: ['No.', "Yes, I'll give you my phone number."],
        note: 'Membership is usually checked with your mobile number.',
      },
    },
    {
      id: 'r0009',
      kind: 'respond',
      line: '要集點嗎？',
      answers: ['不用，謝謝。', '好。'],
      ja: {
        line: 'ポイントを貯めますか。',
        answers: ['いいえ、結構です。', 'はい。'],
        note: '集點：シールやアプリのポイントを集めること',
      },
      en: {
        line: 'Would you like to collect points?',
        answers: ['No, thanks.', 'Sure.'],
        note: '集點 means collecting stickers or app points.',
      },
    },
    {
      id: 'r0010',
      kind: 'respond',
      line: '一共八十五塊。',
      answers: ['好。', '這裡一百。'],
      ja: {
        line: '全部で85元です。',
        answers: ['はい。', '100元でお願いします。'],
        note: '「塊」は「元」の話し言葉',
      },
      en: {
        line: "That's 85 dollars in total.",
        answers: ['OK.', "Here's 100."],
        note: '塊 is the spoken word for 元 (New Taiwan dollars).',
      },
    },
    {
      id: 'r0011',
      kind: 'respond',
      line: '要怎麼付款？',
      answers: ['付現。', '我用悠遊卡。', '刷卡。'],
      ja: {
        line: 'お支払いはどうなさいますか。',
        answers: ['現金で。', '悠遊卡で払います。', 'カードで。'],
        note: '付現＝現金で払う、刷卡＝カードで払う',
      },
      en: {
        line: 'How would you like to pay?',
        answers: ['Cash.', "I'll use my EasyCard.", 'By card.'],
        note: '付現 = pay in cash; 刷卡 = pay by card.',
      },
    },
    {
      id: 'r0012',
      kind: 'respond',
      line: '找您十五塊。',
      answers: ['謝謝。'],
      ja: { line: '15元のお釣りです。', answers: ['ありがとう。'] },
      en: { line: "Here's 15 dollars change.", answers: ['Thank you.'] },
    },
    {
      id: 'r0013',
      kind: 'respond',
      line: '第二件六折喔，要不要再拿一個？',
      answers: ['不用了，謝謝。', '好，那我再拿一個。'],
      ja: {
        line: '2点目は4割引です。もう1つどうですか。',
        answers: ['いいえ、結構です。', 'じゃあ、もう1つ取ってきます。'],
        note: '六折＝定価の60%（4割引）。日本の「6割引」とは逆なので注意',
      },
      en: {
        line: 'The second one is 40% off. Would you like another?',
        answers: ['No, thanks.', "OK, I'll get another one."],
        note: '六折 means you pay 60% of the price (40% off).',
      },
    },
    {
      id: 'r0014',
      kind: 'respond',
      line: '熱的還是冰的？',
      answers: ['熱的。', '冰的。'],
      ja: { line: 'ホットですか、アイスですか。', answers: ['ホットで。', 'アイスで。'] },
      en: { line: 'Hot or iced?', answers: ['Hot.', 'Iced.'] },
    },
    {
      id: 'r0015',
      kind: 'respond',
      line: '大杯還是中杯？',
      answers: ['大杯。', '中杯，謝謝。'],
      ja: { line: 'L サイズですか、M サイズですか。', answers: ['L で。', 'M でお願いします。'] },
      en: { line: 'Large or medium?', answers: ['Large.', 'Medium, please.'] },
    },
    {
      id: 'r0016',
      kind: 'respond',
      line: '需要吸管嗎？',
      answers: ['不用。', '要，謝謝。'],
      ja: { line: 'ストローは要りますか。', answers: ['要りません。', 'はい、ください。'] },
      en: { line: 'Do you need a straw?', answers: ['No.', 'Yes, please.'] },
    },
    {
      id: 'r0017',
      kind: 'respond',
      line: '要分開裝嗎？',
      answers: ['不用，一起就好。', '好，麻煩分開。'],
      ja: {
        line: '別々に入れますか。',
        answers: ['いいえ、一緒で大丈夫です。', 'はい、別々にお願いします。'],
        note: '温かい物と冷たい物を一緒に買ったときなどに聞かれる',
      },
      en: {
        line: 'Shall I bag them separately?',
        answers: ['No, together is fine.', 'Yes, separately please.'],
        note: 'Often asked when you buy hot and cold items together.',
      },
    },
    {
      id: 'r0018',
      kind: 'respond',
      line: '不好意思，這個賣完了。',
      answers: ['好，沒關係。', '那什麼時候會再進貨？'],
      ja: {
        line: 'すみません、これは売り切れです。',
        answers: ['わかりました、大丈夫です。', 'では、次はいつ入荷しますか。'],
        note: '進貨＝入荷',
      },
      en: {
        line: 'Sorry, this is sold out.',
        answers: ["OK, that's fine.", 'When will you get more in?'],
        note: '進貨 = to restock.',
      },
    },
    {
      id: 'r0019',
      kind: 'respond',
      line: '取貨的話，請給我名字跟手機末三碼。',
      answers: ['我姓林，末三碼是一二三。'],
      ja: {
        line: '受け取りでしたら、お名前と携帯番号の下3桁をお願いします。',
        answers: ['林です。下3桁は123です。'],
        note: 'ネット通販の店舗受け取りは、名前と携帯番号の下3桁で確かめる',
      },
      en: {
        line: 'For a pickup, please tell me your name and the last three digits of your phone number.',
        answers: ['My surname is Lin, and the last three digits are 123.'],
        note: 'Online orders picked up in store are checked by name and the last three digits of your mobile number.',
      },
    },
    {
      id: 'r0020',
      kind: 'respond',
      line: '下一位，這邊請。',
      answers: [],
      ja: {
        line: '次の方、こちらへどうぞ。',
        answers: [],
        note: '返事はしなくてよい。呼ばれたレジへ進む',
      },
      en: {
        line: 'Next, please. Over here.',
        answers: [],
        note: 'No reply is needed. Just go to the register.',
      },
    },
    {
      id: 'r0021',
      kind: 'respond',
      line: '謝謝光臨！',
      answers: ['謝謝。'],
      ja: { line: 'ありがとうございました。', answers: ['ありがとう。'] },
      en: { line: 'Thank you for coming!', answers: ['Thank you.'] },
    },

    {
      id: 's0001',
      kind: 'say',
      answers: ['不用袋子，謝謝。', '我不需要袋子。'],
      ja: {
        intent: '袋は要らないと伝えたい',
        answers: ['袋は要りません、ありがとう。', '袋は必要ありません。'],
      },
      en: {
        intent: "You want to say you don't need a bag.",
        answers: ['No bag, thanks.', "I don't need a bag."],
      },
    },
    {
      id: 's0002',
      kind: 'say',
      answers: ['我要一個袋子。', '可以給我一個袋子嗎？'],
      ja: {
        intent: '袋を1つほしい',
        answers: ['袋を1つください。', '袋を1つもらえますか。'],
      },
      en: {
        intent: 'You want one bag.',
        answers: ["I'd like a bag.", 'Could I have a bag?'],
      },
    },
    {
      id: 's0003',
      kind: 'say',
      answers: ['這個可以幫我加熱嗎？', '麻煩幫我微波。'],
      ja: {
        intent: '買った弁当を温めてほしい',
        answers: ['これを温めてもらえますか。', '電子レンジで温めてください。'],
        note: '微波＝電子レンジで温める',
      },
      en: {
        intent: 'You want your lunch box heated.',
        answers: ['Could you heat this up for me?', 'Please microwave it.'],
        note: '微波 = to microwave.',
      },
    },
    {
      id: 's0004',
      kind: 'say',
      answers: ['發票不用，謝謝。', '發票幫我捐掉。'],
      ja: {
        intent: 'レシートは要らないと伝えたい',
        answers: ['レシートは結構です。', 'レシートは寄付してください。'],
        note: '捐掉＝寄付する',
      },
      en: {
        intent: "You want to say you don't need the receipt.",
        answers: ["I don't need the receipt, thanks.", 'Please donate the receipt.'],
        note: '捐 = to donate.',
      },
    },
    {
      id: 's0005',
      kind: 'say',
      answers: ['我用悠遊卡。', '可以刷悠遊卡嗎？'],
      ja: {
        intent: '交通カード（悠遊卡）で払いたい',
        answers: ['悠遊卡で払います。', '悠遊卡で払えますか。'],
      },
      en: {
        intent: 'You want to pay with your EasyCard.',
        answers: ["I'll use my EasyCard.", 'Can I pay with an EasyCard?'],
      },
    },
    {
      id: 's0006',
      kind: 'say',
      answers: ['可以刷卡嗎？', '可以用信用卡嗎？'],
      ja: {
        intent: 'クレジットカードが使えるか聞きたい',
        answers: ['カードで払えますか。', 'クレジットカードは使えますか。'],
      },
      en: {
        intent: 'You want to ask if you can pay by credit card.',
        answers: ['Can I pay by card?', 'Do you take credit cards?'],
      },
    },
    {
      id: 's0007',
      kind: 'say',
      answers: ['我付現。', '我用現金。'],
      ja: { intent: '現金で払いたい', answers: ['現金で払います。', '現金を使います。'] },
      en: { intent: 'You want to pay in cash.', answers: ["I'll pay cash.", "I'll use cash."] },
    },
    {
      id: 's0008',
      kind: 'say',
      answers: ['我要加值悠遊卡，五百塊。'],
      ja: {
        intent: '悠遊卡に500元チャージしたい',
        answers: ['悠遊卡に500元チャージしたいです。'],
        note: '台湾では「加值」（チャージ）と言うのが一般的',
      },
      en: {
        intent: 'You want to top up your EasyCard with 500 dollars.',
        answers: ["I'd like to top up my EasyCard, 500 dollars."],
        note: '加值 is the common word for topping up.',
      },
    },
    {
      id: 's0009',
      kind: 'say',
      answers: ['請問可以借廁所嗎？', '請問有廁所嗎？'],
      ja: {
        intent: 'トイレを借りたい',
        answers: ['トイレをお借りできますか。', 'トイレはありますか。'],
      },
      en: {
        intent: 'You want to use the restroom.',
        answers: ['May I use the restroom?', 'Is there a restroom?'],
      },
    },
    {
      id: 's0010',
      kind: 'say',
      answers: ['請問電池在哪裡？', '請問有賣電池嗎？'],
      ja: {
        intent: '電池がどこにあるか聞きたい',
        answers: ['電池はどこにありますか。', '電池は売っていますか。'],
      },
      en: {
        intent: 'You want to ask where the batteries are.',
        answers: ['Where are the batteries?', 'Do you sell batteries?'],
      },
    },
    {
      id: 's0011',
      kind: 'say',
      answers: ['可以給我筷子嗎？', '請給我一雙筷子。'],
      ja: {
        intent: '箸を付けてほしい',
        answers: ['箸をもらえますか。', '箸を1膳ください。'],
        note: '箸は「雙」で数える',
      },
      en: {
        intent: 'You want chopsticks.',
        answers: ['Could I have chopsticks?', 'A pair of chopsticks, please.'],
        note: 'Chopsticks are counted with 雙 (pair).',
      },
    },
    {
      id: 's0012',
      kind: 'say',
      answers: ['可以給我湯匙嗎？', '請給我一支湯匙。'],
      ja: {
        intent: 'スプーンを付けてほしい',
        answers: ['スプーンをもらえますか。', 'スプーンを1本ください。'],
      },
      en: {
        intent: 'You want a spoon.',
        answers: ['Could I have a spoon?', 'A spoon, please.'],
      },
    },
    {
      id: 's0013',
      kind: 'say',
      answers: ['我要一杯大杯冰美式。'],
      ja: {
        intent: 'アイスのアメリカーノの L サイズがほしい',
        answers: ['アイスのアメリカーノを L で1つください。'],
        note: '美式＝アメリカーノ',
      },
      en: {
        intent: 'You want a large iced Americano.',
        answers: ["I'd like a large iced Americano."],
        note: '美式 = Americano.',
      },
    },
    {
      id: 's0014',
      kind: 'say',
      answers: ['我要一杯中杯熱拿鐵。'],
      ja: {
        intent: 'ホットのラテの M サイズがほしい',
        answers: ['ホットのラテを M で1つください。'],
      },
      en: {
        intent: 'You want a medium hot latte.',
        answers: ["I'd like a medium hot latte."],
      },
    },
    {
      id: 's0015',
      kind: 'say',
      answers: ['不用糖跟奶精，謝謝。'],
      ja: {
        intent: '砂糖とミルクは要らないと伝えたい',
        answers: ['砂糖とミルクは要りません。'],
        note: '奶精＝コーヒー用のミルク（クリーム）',
      },
      en: {
        intent: "You want to say you don't need sugar or creamer.",
        answers: ['No sugar or creamer, thanks.'],
        note: '奶精 = coffee creamer.',
      },
    },
    {
      id: 's0016',
      kind: 'say',
      answers: ['我要取貨。', '我來領包裹。'],
      ja: {
        intent: 'ネット通販の荷物を受け取りたい',
        answers: ['荷物の受け取りをお願いします。', '荷物を受け取りに来ました。'],
      },
      en: {
        intent: 'You want to pick up an online order.',
        answers: ["I'm here for a pickup.", "I've come to collect a parcel."],
      },
    },
    {
      id: 's0017',
      kind: 'say',
      answers: ['我要寄包裹。'],
      ja: { intent: '荷物を送りたい', answers: ['荷物を送りたいです。'] },
      en: { intent: 'You want to send a parcel.', answers: ["I'd like to send a parcel."] },
    },
    {
      id: 's0018',
      kind: 'say',
      answers: ['請問影印機怎麼用？'],
      ja: { intent: 'コピー機の使い方を聞きたい', answers: ['コピー機はどう使いますか。'] },
      en: {
        intent: 'You want to ask how to use the photocopier.',
        answers: ['How do I use the photocopier?'],
      },
    },
    {
      id: 's0019',
      kind: 'say',
      answers: ['請問有提款機嗎？'],
      ja: {
        intent: 'ATM があるか聞きたい',
        answers: ['ATM はありますか。'],
        note: '提款機＝ATM。「ATM」もそのまま通じる',
      },
      en: {
        intent: 'You want to ask if there is an ATM.',
        answers: ['Is there an ATM?'],
        note: '提款機 = ATM. Saying "ATM" also works.',
      },
    },
    {
      id: 's0020',
      kind: 'say',
      answers: ['可以分開裝嗎？', '熱的跟冰的分開裝，謝謝。'],
      ja: {
        intent: '温かい物と冷たい物を別々に入れてほしい',
        answers: ['別々に入れてもらえますか。', '温かい物と冷たい物を分けてください。'],
      },
      en: {
        intent: 'You want hot and cold items bagged separately.',
        answers: ['Could you bag them separately?', 'Please keep the hot and cold things apart.'],
      },
    },
    {
      id: 's0021',
      kind: 'say',
      answers: ['不好意思，可以再說一次嗎？'],
      ja: {
        intent: '聞き取れなかったので、もう一度言ってほしい',
        answers: ['すみません、もう一度言ってもらえますか。'],
      },
      en: {
        intent: "You didn't catch that and want them to say it again.",
        answers: ['Sorry, could you say that again?'],
      },
    },
    {
      id: 's0022',
      kind: 'say',
      answers: ['可以說慢一點嗎？'],
      ja: { intent: 'ゆっくり話してほしい', answers: ['もう少しゆっくり話してもらえますか。'] },
      en: {
        intent: 'You want them to speak more slowly.',
        answers: ['Could you speak more slowly?'],
      },
    },
    {
      id: 's0023',
      kind: 'say',
      answers: ['我中文不太好。', '我只會說一點中文。'],
      ja: {
        intent: '中国語が少ししか話せないと伝えたい',
        answers: ['中国語はあまり上手ではありません。', '中国語は少ししか話せません。'],
      },
      en: {
        intent: 'You want to say you only speak a little Chinese.',
        answers: ["My Chinese isn't very good.", 'I only speak a little Chinese.'],
      },
    },
  ],
}
