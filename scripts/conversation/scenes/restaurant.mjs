// 場面：飲食店（仕様書 18.6）。AI（Claude）による下書き
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'restaurant',
    version: 1,
    name: '餐廳',
    level: 1,
    names: { ja: '飲食店', en: 'Restaurant' },
  },
  phrases: [
    respond('r0022', '幾位？', ['兩位。', '一個人。'], {
      ja: ['何名様ですか。', ['2人です。', '1人です。'], '「位」は人を丁寧に数える語'],
      en: ['How many people?', ['Two.', 'Just one.'], '位 is a polite counter for people.'],
    }),
    respond('r0023', '內用還是外帶？', ['內用。', '外帶。'], {
      ja: [
        '店内でお召し上がりですか、お持ち帰りですか。',
        ['店内で。', '持ち帰りで。'],
        '內用＝店内で食べる、外帶＝持ち帰り',
      ],
      en: ['For here or to go?', ['For here.', 'To go.'], '內用 = eat in; 外帶 = take away.'],
    }),
    respond('r0024', '有訂位嗎？', ['沒有。', '有，我姓林。'], {
      ja: ['ご予約はありますか。', ['していません。', 'はい、林です。']],
      en: ['Do you have a reservation?', ['No.', 'Yes, under the name Lin.']],
    }),
    respond('r0025', '現在客滿，要稍等一下喔。', ['大概要等多久？', '好，我們等。'], {
      ja: [
        'ただいま満席です。少しお待ちいただきます。',
        ['どのくらい待ちますか。', 'はい、待ちます。'],
      ],
      en: [
        "We're full right now, so there's a short wait.",
        ['About how long is the wait?', "OK, we'll wait."],
      ],
    }),
    respond('r0026', '這邊請。', ['好，謝謝。'], {
      ja: ['こちらへどうぞ。', ['はい、ありがとう。']],
      en: ['This way, please.', ['OK, thank you.']],
    }),
    respond('r0027', '可以點餐了嗎？', ['還沒，再等一下。', '可以，我要這個。'], {
      ja: [
        'ご注文はお決まりですか。',
        ['まだです、もう少し待ってください。', 'はい、これをお願いします。'],
      ],
      en: ['Are you ready to order?', ['Not yet, give us a minute.', "Yes, I'll have this."]],
    }),
    respond('r0028', '點好了再叫我。', ['好，謝謝。'], {
      ja: ['決まったらお呼びください。', ['はい、ありがとう。']],
      en: ["Call me when you're ready.", ['OK, thanks.']],
    }),
    respond('r0029', '要辣嗎？', ['不要辣。', '小辣就好。'], {
      ja: [
        '辛くしますか。',
        ['辛くしないでください。', '少し辛めで。'],
        '辛さは小辣・中辣・大辣などで伝える',
      ],
      en: [
        'Do you want it spicy?',
        ['Not spicy.', 'Just a little spicy.'],
        'Spice levels: 小辣 (mild), 中辣 (medium), 大辣 (hot).',
      ],
    }),
    respond('r0030', '飯要大碗還是小碗？', ['小碗就好。', '大碗。'], {
      ja: ['ご飯は大盛りですか、小盛りですか。', ['小さいほうで。', '大盛りで。']],
      en: ['Large or small bowl of rice?', ['A small one is fine.', 'Large.']],
    }),
    respond('r0031', '還需要什麼嗎？', ['這樣就好。', '再一杯紅茶。'], {
      ja: ['ほかにご注文はありますか。', ['これで大丈夫です。', '紅茶をもう1杯。']],
      en: ['Anything else?', ["That's all.", 'Another black tea, please.']],
    }),
    respond('r0032', '這個要等比較久喔。', ['沒關係。', '那我換別的。'], {
      ja: ['こちらは少しお時間がかかります。', ['大丈夫です。', 'では、別のものにします。']],
      en: ['This one takes a bit longer.', ["That's fine.", "Then I'll order something else."]],
    }),
    respond('r0033', '請先結帳。', ['好，多少錢？'], {
      ja: [
        'お会計を先にお願いします。',
        ['はい、いくらですか。'],
        '小吃店や食堂は先払いのことが多い',
      ],
      en: [
        'Please pay first.',
        ['OK, how much is it?'],
        'Small eateries often ask you to pay first.',
      ],
    }),
    respond('r0034', '一起付還是分開付？', ['一起付。', '分開付。'], {
      ja: ['お会計はご一緒ですか、別々ですか。', ['一緒で。', '別々で。']],
      en: ['Together or separately?', ['Together.', 'Separately.']],
    }),
    respond('r0035', '這個可以收了嗎？', ['可以，謝謝。', '還沒，我還在吃。'], {
      ja: ['こちらはお下げしてもよろしいですか。', ['はい、どうぞ。', 'まだ食べています。']],
      en: ['May I take this away?', ['Yes, thank you.', "Not yet, I'm still eating."]],
    }),
    respond('r0036', '小心燙。', ['好，謝謝。'], {
      ja: ['熱いのでお気をつけください。', ['はい、ありがとう。']],
      en: ["Careful, it's hot.", ['OK, thanks.']],
    }),
    respond('r0037', '餐具在那邊，自己拿喔。', ['好，謝謝。'], {
      ja: [
        'お箸などはあちらです。ご自由にお取りください。',
        ['はい、ありがとう。'],
        'セルフサービスの店が多い',
      ],
      en: [
        'Cutlery is over there. Help yourself.',
        ['OK, thanks.'],
        'Many places are self-service.',
      ],
    }),

    say('s0024', ['兩位。', '我們兩個人。'], {
      ja: ['2人だと伝えたい', ['2人です。', '私たちは2人です。']],
      en: ['You want to say there are two of you.', ['Two.', 'There are two of us.']],
    }),
    say('s0025', ['外帶。', '我要外帶。'], {
      ja: ['持ち帰りにしたい', ['持ち帰りで。', '持ち帰りにします。']],
      en: ['You want your order to go.', ['To go.', "I'd like it to go."]],
    }),
    say('s0026', ['內用。', '我要在這裡吃。'], {
      ja: ['店内で食べたい', ['店内で。', 'ここで食べます。']],
      en: ['You want to eat in.', ['For here.', "I'll eat here."]],
    }),
    say('s0027', ['可以給我菜單嗎？'], {
      ja: ['メニューがほしい', ['メニューをもらえますか。']],
      en: ['You want a menu.', ['Could I have a menu?']],
    }),
    say('s0028', ['有什麼推薦的嗎？', '你們的招牌是什麼？'], {
      ja: [
        'おすすめを聞きたい',
        ['おすすめはありますか。', 'この店の看板商品は何ですか。'],
        '招牌＝看板（商品）',
      ],
      en: [
        'You want to ask for a recommendation.',
        ['What do you recommend?', "What's your signature item?"],
        '招牌 = signature item.',
      ],
    }),
    say('s0029', ['我要這個，一份。', '這個一份，謝謝。'], {
      ja: [
        '（指さしながら）これを1つ注文したい',
        ['これを1人前ください。', 'これを1つ、お願いします。'],
        '份＝1人前',
      ],
      en: [
        '(Pointing) You want to order one of these.',
        ["I'll have one of these.", 'One of this, please.'],
        '份 = a portion.',
      ],
    }),
    say('s0030', ['不要辣。', '可以不要加辣嗎？'], {
      ja: ['辛くしないでほしい', ['辛くしないでください。', '辛さを入れないでもらえますか。']],
      en: ["You don't want it spicy.", ['Not spicy, please.', 'Could you leave out the chili?']],
    }),
    say('s0031', ['不要香菜。', '可以不要加香菜嗎？'], {
      ja: [
        'パクチーを入れないでほしい',
        ['パクチーは抜いてください。', 'パクチーを入れないでもらえますか。'],
      ],
      en: [
        "You don't want coriander.",
        ['No coriander, please.', 'Could you leave out the coriander?'],
      ],
    }),
    say('s0032', ['可以給我一杯水嗎？'], {
      ja: ['水がほしい', ['水を1杯もらえますか。']],
      en: ['You want a glass of water.', ['Could I have a glass of water?']],
    }),
    say('s0033', ['可以給我一個小盤子嗎？'], {
      ja: ['取り分け用の小皿がほしい', ['小皿を1枚もらえますか。']],
      en: ['You want a small plate for sharing.', ['Could I have a small plate?']],
    }),
    say('s0034', ['我要結帳。', '買單。'], {
      ja: ['会計をしたい', ['お会計をお願いします。', 'お勘定。']],
      en: ['You want to pay the bill.', ["I'd like to pay.", 'The bill, please.']],
    }),
    say('s0035', ['這個可以幫我打包嗎？'], {
      ja: ['残った料理を持ち帰りたい', ['これを包んでもらえますか。'], '打包＝持ち帰り用に包む'],
      en: [
        'You want to take the leftovers home.',
        ['Could you pack this up for me?'],
        '打包 = to pack food to take away.',
      ],
    }),
    say('s0036', ['不好意思，我點的菜還沒來。'], {
      ja: ['注文した料理がまだ来ないと伝えたい', ['すみません、注文した料理がまだ来ていません。']],
      en: ["Your food hasn't arrived yet.", ["Excuse me, the dish I ordered hasn't come yet."]],
    }),
    say('s0037', ['不好意思，這不是我點的。'], {
      ja: ['注文したものと違うと伝えたい', ['すみません、これは注文したものではありません。']],
      en: ["You got something you didn't order.", ["Excuse me, this isn't what I ordered."]],
    }),
    say('s0038', ['我對蝦子過敏。', '我不能吃蝦子。'], {
      ja: [
        'エビのアレルギーがあると伝えたい',
        ['エビのアレルギーがあります。', 'エビが食べられません。'],
      ],
      en: [
        "You want to say you're allergic to shrimp.",
        ["I'm allergic to shrimp.", "I can't eat shrimp."],
      ],
    }),
    say('s0039', ['請問廁所在哪裡？'], {
      ja: ['トイレがどこにあるか聞きたい', ['トイレはどこですか。']],
      en: ['You want to ask where the restroom is.', ['Where is the restroom?']],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['r0001', 'r0011', 'r0010', 'r0012', 's0006', 's0007', 's0021', 's0022', 's0023'],
}
