// 場面：夜市（仕様書 18.6）。AI（Claude）による下書き
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'night-market',
    version: 1,
    name: '夜市',
    level: 1,
    names: { ja: '夜市', en: 'Night market' },
  },
  phrases: [
    respond('r0047', '要幾份？', ['一份。', '兩份。'], {
      ja: ['何人前ですか。', ['1人前です。', '2人前です。']],
      en: ['How many portions?', ['One.', 'Two.']],
    }),
    respond('r0048', '要加胡椒粉跟九層塔嗎？', ['都要。', '不要九層塔。'], {
      ja: [
        'コショウとバジルを入れますか。',
        ['両方入れてください。', 'バジルは要りません。'],
        '九層塔＝台湾バジル。揚げ物の屋台でよく聞かれる',
      ],
      en: [
        'Would you like pepper and basil?',
        ['Both, please.', 'No basil.'],
        '九層塔 is Taiwanese basil, often added at fried-food stalls.',
      ],
    }),
    respond('r0049', '要切嗎？', ['要，幫我切。', '不用切。'], {
      ja: [
        '切りますか。',
        ['はい、切ってください。', '切らなくていいです。'],
        '雞排（大きなフライドチキン）などで聞かれる',
      ],
      en: [
        'Shall I cut it?',
        ['Yes, please cut it.', 'No need to cut it.'],
        'Asked for things like 雞排 (large fried chicken cutlets).',
      ],
    }),
    respond('r0050', '一份一百，兩份一百八。', ['那我要兩份。', '一份就好。'], {
      ja: ['1つ100元、2つで180元です。', ['じゃあ、2つください。', '1つで大丈夫です。']],
      en: ['100 for one, 180 for two.', ["Then I'll take two.", 'Just one is fine.']],
    }),
    respond('r0051', '要在這邊吃嗎？', ['對，在這邊吃。', '不用，我帶走。'], {
      ja: ['ここで食べますか。', ['はい、ここで食べます。', 'いいえ、持って帰ります。']],
      en: ['Are you eating here?', ["Yes, I'll eat here.", "No, I'll take it with me."]],
    }),
    respond('r0052', '位子在裡面，自己找位子坐喔。', ['好，謝謝。'], {
      ja: ['席は奥です。空いている席にお座りください。', ['はい、ありがとう。']],
      en: ['Seats are inside. Find yourself a seat.', ['OK, thanks.']],
    }),
    respond('r0053', '試吃看看！', ['謝謝，好吃！', '不用了，謝謝。'], {
      ja: ['試食してみてください。', ['ありがとう、おいしい！', 'いいえ、結構です。']],
      en: ['Try a sample!', ["Thanks, it's tasty!", 'No, thank you.']],
    }),
    respond('r0054', '現在排隊大概要二十分鐘。', ['好，我等。', '那我下次再來。'], {
      ja: ['今並ぶと20分ほどかかります。', ['はい、待ちます。', 'では、また今度来ます。']],
      en: [
        'The line is about 20 minutes right now.',
        ["OK, I'll wait.", "Then I'll come back another time."],
      ],
    }),
    respond('r0055', '我們只收現金喔。', ['好。', '那附近有提款機嗎？'], {
      ja: [
        '現金のみです。',
        ['わかりました。', 'では、近くに ATM はありますか。'],
        '夜市の屋台は現金のみが多い',
      ],
      en: [
        'We only take cash.',
        ['OK.', 'Is there an ATM nearby, then?'],
        'Many night market stalls are cash only.',
      ],
    }),
    respond('r0056', '有沒有零錢？', ['沒有，不好意思。', '有，我找找看。'], {
      ja: ['小銭はありますか。', ['ありません、すみません。', 'あります、探してみます。']],
      en: ['Do you have small change?', ['No, sorry.', 'Yes, let me look.']],
    }),

    say('s0049', ['這個多少錢？', '一份多少？'], {
      ja: ['値段を聞きたい', ['これはいくらですか。', '1人前いくらですか。']],
      en: ['You want to ask the price.', ['How much is this?', 'How much for one portion?']],
    }),
    say('s0050', ['可以算便宜一點嗎？', '買兩個可以便宜一點嗎？'], {
      ja: [
        '少し安くしてほしい',
        ['少し安くしてもらえますか。', '2つ買うので安くなりますか。'],
        '食べ物の屋台では値切らないのが普通。値段の交渉は服や雑貨の店で',
      ],
      en: [
        'You want a small discount.',
        ['Could you make it a bit cheaper?', 'Is it cheaper if I buy two?'],
        "People don't usually haggle at food stalls; it's more common at clothing or goods stalls.",
      ],
    }),
    say('s0051', ['請問這裡是排隊的地方嗎？', '請問隊伍的最後面在哪裡？'], {
      ja: ['ここが列の最後か聞きたい', ['ここが列ですか。', '列の最後はどこですか。']],
      en: [
        'You want to check where the line ends.',
        ['Is this the line?', 'Where does the line end?'],
      ],
    }),
    say('s0052', ['我只要一個。'], {
      ja: ['1つだけ買いたい', ['1つだけください。']],
      en: ['You only want one.', ['Just one, please.']],
    }),
    say('s0053', ['可以試吃嗎？'], {
      ja: ['試食できるか聞きたい', ['試食できますか。']],
      en: ['You want to ask if you can try a sample.', ['Can I try some?']],
    }),
    say('s0054', ['可以拍照嗎？'], {
      ja: ['写真を撮ってもよいか聞きたい', ['写真を撮ってもいいですか。']],
      en: ['You want to ask if you can take a photo.', ['May I take a photo?']],
    }),
    say('s0055', ['我要小辣。', '一點點辣就好。'], {
      ja: ['少しだけ辛くしてほしい', ['少し辛めでお願いします。', 'ほんの少し辛くしてください。']],
      en: ['You want it just a little spicy.', ['Mild, please.', 'Just a tiny bit spicy.']],
    }),
    say('s0056', ['可以用行動支付嗎？'], {
      ja: ['スマホ決済が使えるか聞きたい', ['スマホ決済は使えますか。'], '行動支付＝スマホ決済'],
      en: [
        'You want to ask if you can pay with your phone.',
        ['Can I pay by mobile?'],
        '行動支付 = mobile payment.',
      ],
    }),
    say('s0057', ['請問垃圾桶在哪裡？'], {
      ja: [
        'ゴミ箱の場所を聞きたい',
        ['ゴミ箱はどこですか。'],
        '台湾は道にゴミ箱が少ない。店や屋台の近くにあることが多い',
      ],
      en: [
        'You want to ask where the rubbish bin is.',
        ['Where is the rubbish bin?'],
        'Public bins are rare in Taiwan; stalls often have one nearby.',
      ],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: [
    'r0029',
    'r0036',
    'r0002',
    'r0010',
    'r0012',
    's0007',
    's0028',
    's0029',
    's0031',
    's0021',
    's0022',
    's0023',
  ],
}
