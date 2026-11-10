// 場面：交通（タクシー・MRT・バス）（仕様書 18.6）。AI（Claude）による下書き
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'transport',
    version: 1,
    name: '交通',
    level: 1,
    names: { ja: '交通（タクシー・MRT・バス）', en: 'Getting around (taxi, MRT, bus)' },
  },
  phrases: [
    respond('r0057', '要去哪裡？', ['我要去台北車站。', '請到這個地址。'], {
      ja: [
        'どちらまで行きますか。',
        ['台北駅までお願いします。', 'この住所までお願いします。'],
        '住所はスマホや紙で見せるとよい',
      ],
      en: [
        'Where to?',
        ['Taipei Main Station, please.', 'To this address, please.'],
        'It helps to show the address on your phone or on paper.',
      ],
    }),
    respond('r0058', '走高速公路可以嗎？', ['可以。', '走一般道路就好。'], {
      ja: ['高速道路を使ってもいいですか。', ['いいですよ。', '一般道で大丈夫です。']],
      en: ['Is it OK to take the highway?', ['Sure.', 'Regular roads are fine.']],
    }),
    respond('r0059', '到了，一共兩百三十塊。', ['好，這裡兩百五，不用找了。', '可以刷卡嗎？'], {
      ja: [
        '着きました。230元です。',
        ['はい、250元で。お釣りは結構です。', 'カードで払えますか。'],
        'タクシーでチップは要らない',
      ],
      en: [
        "We're here. That's 230 dollars.",
        ["Here's 250, keep the change.", 'Can I pay by card?'],
        'Tipping taxi drivers is not expected.',
      ],
    }),
    respond('r0060', '要在哪裡停？', ['前面路口停就好。', '在那間便利商店前面停。'], {
      ja: [
        'どこで止めますか。',
        ['その先の交差点で止めてください。', 'あのコンビニの前で止めてください。'],
      ],
      en: [
        'Where should I stop?',
        ['The next intersection is fine.', 'Stop in front of that convenience store.'],
      ],
    }),
    respond('r0061', '後車廂要開嗎？', ['要，麻煩你。', '不用，謝謝。'], {
      ja: ['トランクを開けますか。', ['はい、お願いします。', 'いいえ、大丈夫です。']],
      en: ['Do you need the trunk open?', ['Yes, please.', 'No, thanks.']],
    }),
    respond('r0062', '要收據嗎？', ['要，謝謝。', '不用。'], {
      ja: ['領収書は要りますか。', ['はい、ください。', '要りません。']],
      en: ['Do you need a receipt?', ['Yes, please.', 'No.']],
    }),
    respond('r0063', '這班車沒有到動物園喔。', ['那我要搭哪一班？'], {
      ja: ['このバスは動物園には行きません。', ['では、どのバスに乗ればいいですか。']],
      en: ["This bus doesn't go to the zoo.", ['Then which bus should I take?']],
    }),
    respond('r0064', '上車跟下車都要刷卡喔。', ['好，謝謝。'], {
      ja: [
        '乗るときと降りるとき、両方カードをタッチしてください。',
        ['はい、ありがとう。'],
        '台北のバスなど。路線によって違う',
      ],
      en: [
        'Tap your card both when you get on and when you get off.',
        ['OK, thanks.'],
        'Common on Taipei buses; it depends on the route.',
      ],
    }),
    respond('r0065', '餘額不足，請加值。', ['請問哪裡可以加值？'], {
      ja: [
        '残高が足りません。チャージしてください。',
        ['どこでチャージできますか。'],
        '改札で表示される。駅の機械やコンビニでチャージできる',
      ],
      en: [
        'Insufficient balance. Please top up.',
        ['Where can I top up?'],
        'Shown at the gates. You can top up at station machines or convenience stores.',
      ],
    }),
    respond('r0066', '捷運上不能吃東西喔。', ['不好意思。'], {
      ja: ['MRT の中では飲食禁止です。', ['すみません。'], '飲み物も禁止。罰金がある'],
      en: [
        "You can't eat on the MRT.",
        ['Sorry.'],
        'Drinks are not allowed either, and there are fines.',
      ],
    }),
    respond('r0067', '請往後面走。', ['好。'], {
      ja: ['奥へお進みください。', ['はい。']],
      en: ['Please move to the back.', ['OK.']],
    }),

    say('s0058', ['請到這個地址。', '麻煩到這裡。'], {
      ja: [
        '（タクシーで）この住所まで行きたい',
        ['この住所までお願いします。', 'ここまでお願いします。'],
      ],
      en: [
        '(In a taxi) You want to go to this address.',
        ['To this address, please.', 'Here, please.'],
      ],
    }),
    say('s0059', ['我要去台北車站。', '麻煩到台北車站。'], {
      ja: ['台北駅まで行きたい', ['台北駅に行きたいです。', '台北駅までお願いします。']],
      en: [
        'You want to go to Taipei Main Station.',
        ["I'm going to Taipei Main Station.", 'Taipei Main Station, please.'],
      ],
    }),
    say('s0060', ['這裡停就好，謝謝。', '請在這裡停。'], {
      ja: ['ここで止めてほしい', ['ここで大丈夫です、ありがとう。', 'ここで止めてください。']],
      en: ['You want the driver to stop here.', ['Here is fine, thanks.', 'Please stop here.']],
    }),
    say('s0061', ['我有點趕時間，麻煩你了。'], {
      ja: ['急いでいると伝えたい', ['少し急いでいるので、よろしくお願いします。']],
      en: ["You want to say you're in a hurry.", ["I'm in a bit of a hurry, thanks."]],
    }),
    say('s0062', ['到那裡大概多少錢？'], {
      ja: ['だいたいの料金を聞きたい', ['そこまでだいたいいくらですか。']],
      en: ['You want to ask roughly how much it costs.', ['About how much is it to get there?']],
    }),
    say('s0063', ['到那裡大概要多久？'], {
      ja: ['着くまでの時間を聞きたい', ['そこまでどのくらいかかりますか。']],
      en: ['You want to ask how long it takes.', ['About how long does it take to get there?']],
    }),
    say('s0064', ['請問捷運站在哪裡？'], {
      ja: ['MRT の駅の場所を聞きたい', ['MRT の駅はどこですか。']],
      en: ['You want to ask where the MRT station is.', ['Where is the MRT station?']],
    }),
    say('s0065', ['請問這班公車有到動物園嗎？'], {
      ja: ['このバスが動物園に行くか聞きたい', ['このバスは動物園に行きますか。']],
      en: ['You want to ask if this bus goes to the zoo.', ['Does this bus go to the zoo?']],
    }),
    say('s0066', ['請問要在哪一站換車？'], {
      ja: ['どの駅で乗り換えるか聞きたい', ['どの駅で乗り換えればいいですか。']],
      en: ['You want to ask where to change trains.', ['Which station do I change at?']],
    }),
    say('s0067', ['到了可以告訴我嗎？'], {
      ja: ['（バスで）着いたら教えてほしい', ['着いたら教えてもらえますか。']],
      en: [
        '(On a bus) You want to be told when you arrive.',
        ['Could you tell me when we get there?'],
      ],
    }),
    say('s0068', ['請問單程票怎麼買？'], {
      ja: ['片道の切符の買い方を聞きたい', ['片道の切符はどうやって買いますか。']],
      en: [
        'You want to ask how to buy a single ticket.',
        ['How do I buy a single-journey ticket?'],
      ],
    }),
    say('s0069', ['請坐。', '您坐這裡吧。'], {
      ja: ['席を譲りたい', ['どうぞ座ってください。', 'こちらにお座りください。']],
      en: ['You want to offer your seat.', ['Please sit down.', 'Please take this seat.']],
    }),
    say('s0070', ['不好意思，我要下車。', '借過一下。'], {
      ja: [
        '混んだ車内で降りたい',
        ['すみません、降ります。', 'ちょっと通してください。'],
        '借過＝通してください',
      ],
      en: [
        'You want to get off a crowded train or bus.',
        ['Excuse me, I need to get off.', 'Excuse me, coming through.'],
        '借過 = excuse me, let me through.',
      ],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['s0005', 's0006', 's0008', 's0021', 's0022', 's0023'],
}
