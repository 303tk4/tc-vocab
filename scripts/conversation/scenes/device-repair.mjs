// 場面：スマホ・パソコンの修理（上級向け。仕様書 18.6）。AI（Claude）による下書き
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'device-repair',
    version: 1,
    name: '手機・電腦維修',
    level: 2,
    names: { ja: 'スマホ・パソコンの修理', en: 'Phone and computer repair' },
  },
  phrases: [
    respond('r0079', '請問是什麼問題？', ['螢幕破了。', '手機開不了機。'], {
      ja: ['どのような不具合ですか。', ['画面が割れました。', 'スマホの電源が入りません。']],
      en: ["What's the problem?", ['The screen is cracked.', "My phone won't turn on."]],
    }),
    respond('r0080', '還在保固期內嗎？', ['應該還在。', '已經過保固了。'], {
      ja: [
        'まだ保証期間内ですか。',
        ['まだのはずです。', 'もう保証が切れています。'],
        '保固＝メーカーや店の保証',
      ],
      en: [
        'Is it still under warranty?',
        ['It should be.', "The warranty's already expired."],
        '保固 = warranty.',
      ],
    }),
    respond('r0081', '有保固卡或發票嗎？', ['有，在這裡。', '沒有，不見了。'], {
      ja: ['保証書かレシートはありますか。', ['はい、これです。', 'いいえ、なくしました。']],
      en: ['Do you have the warranty card or the receipt?', ['Yes, here.', "No, I've lost it."]],
    }),
    respond(
      'r0082',
      '檢測要收三百元檢測費。',
      ['好，沒問題。', '如果修的話，還要另外付檢測費嗎？'],
      {
        ja: [
          '点検には、点検料が300元かかります。',
          ['はい、大丈夫です。', '修理する場合も、点検料は別に払うのですか。'],
          '檢測費＝点検（診断）の料金。修理するとかからない店もある',
        ],
        en: [
          "There's a 300-dollar inspection fee.",
          ['OK, no problem.', 'If I get it repaired, do I still pay the inspection fee?'],
          '檢測費 = diagnostic fee. Some shops waive it if you go ahead with the repair.',
        ],
      },
    ),
    respond('r0083', '修好大概要三到五天。', ['可以快一點嗎？', '好，那我等你們通知。'], {
      ja: [
        '修理には3〜5日ほどかかります。',
        ['もう少し早くできますか。', 'わかりました、連絡を待ちます。'],
      ],
      en: [
        'The repair will take about three to five days.',
        ['Can it be done any faster?', "OK, I'll wait to hear from you."],
      ],
    }),
    respond(
      'r0084',
      '資料有備份嗎？修理可能會清除資料。',
      ['有，我已經備份了。', '還沒，我先備份再拿來。'],
      {
        ja: [
          'データのバックアップはありますか。修理でデータが消えることがあります。',
          ['はい、バックアップしてあります。', 'まだです。先にバックアップしてから持ってきます。'],
        ],
        en: [
          'Have you backed up your data? The repair may erase it.',
          ["Yes, I've backed it up.", "Not yet. I'll back it up first and bring it back."],
        ],
      },
    ),
    respond('r0085', '換電池大概要兩千元。', ['好，請幫我換。', '我考慮一下。'], {
      ja: ['電池の交換は2000元くらいです。', ['はい、交換してください。', '少し考えます。']],
      en: [
        'Replacing the battery costs about 2,000 dollars.',
        ['OK, please replace it.', "I'll think about it."],
      ],
    }),
    respond(
      'r0086',
      '可以告訴我們手機的密碼嗎？',
      ['可以，我寫給你。', '不好意思，我不太方便給。'],
      {
        ja: [
          'スマホのパスコードを教えてもらえますか。',
          ['はい、書いて渡します。', 'すみません、教えるのはちょっと……。'],
          '点検に必要と言われることがある。教えたくなければ断ってもよい',
        ],
        en: [
          'Could you tell us the phone passcode?',
          ["Sure, I'll write it down for you.", "Sorry, I'd rather not."],
          'Shops sometimes ask for it to test the phone. You may refuse.',
        ],
      },
    ),
    respond('r0087', '修好了會打電話通知你。', ['好，謝謝。', '可以用簡訊通知嗎？'], {
      ja: [
        '直ったら電話でお知らせします。',
        ['はい、ありがとう。', 'ショートメッセージで知らせてもらえますか。'],
        '簡訊＝SMS（ショートメッセージ）',
      ],
      en: [
        "We'll call you when it's fixed.",
        ['OK, thanks.', 'Could you let me know by text message?'],
        '簡訊 = text message (SMS).',
      ],
    }),
    respond('r0088', '這是取件單，來拿的時候請帶著。', ['好，謝謝。'], {
      ja: ['こちらは受け取りの控えです。受け取りの際にお持ちください。', ['はい、ありがとう。']],
      en: ["Here's your claim slip. Please bring it when you pick it up.", ['OK, thank you.']],
    }),

    say('s0080', ['我的手機螢幕破了。'], {
      ja: ['スマホの画面が割れたと伝えたい', ['スマホの画面が割れました。']],
      en: ['You want to say your phone screen is cracked.', ['My phone screen is cracked.']],
    }),
    say('s0081', ['手機充不了電。', '我的手機不能充電。'], {
      ja: [
        'スマホが充電できないと伝えたい',
        ['スマホが充電できません。', '私のスマホは充電できません。'],
      ],
      en: [
        "You want to say your phone won't charge.",
        ["My phone won't charge.", "My phone can't be charged."],
      ],
    }),
    say('s0082', ['我的電腦開不了機。'], {
      ja: ['パソコンの電源が入らないと伝えたい', ['パソコンの電源が入りません。']],
      en: ["You want to say your computer won't turn on.", ["My computer won't start."]],
    }),
    say('s0083', ['電池很快就沒電了。'], {
      ja: ['電池の減りが早いと伝えたい', ['電池がすぐになくなります。']],
      en: ['You want to say the battery runs out quickly.', ['The battery dies really fast.']],
    }),
    say('s0084', ['修理大概要多少錢？', '可以先幫我估價嗎？'], {
      ja: [
        '修理代を聞きたい',
        ['修理はだいたいいくらですか。', '先に見積もりを出してもらえますか。'],
        '估價＝見積もり',
      ],
      en: [
        'You want to ask about the repair cost.',
        ['About how much will the repair cost?', 'Could you give me an estimate first?'],
        '估價 = estimate.',
      ],
    }),
    say('s0085', ['大概要修幾天？'], {
      ja: ['修理に何日かかるか聞きたい', ['修理には何日くらいかかりますか。']],
      en: [
        'You want to ask how many days the repair takes.',
        ['How many days will the repair take?'],
      ],
    }),
    say('s0086', ['今天可以修好嗎？'], {
      ja: ['今日中に直るか聞きたい', ['今日中に直りますか。']],
      en: ['You want to ask if it can be fixed today.', ['Can it be fixed today?']],
    }),
    say('s0087', ['可以不要刪除我的資料嗎？'], {
      ja: ['データを消さないでほしい', ['データを消さないでもらえますか。']],
      en: ["You don't want your data erased.", ['Could you not delete my data?']],
    }),
    say('s0088', ['我來拿修好的手機。'], {
      ja: [
        '修理が終わったスマホを受け取りに来たと伝えたい',
        ['修理したスマホを受け取りに来ました。'],
      ],
      en: [
        "You've come to collect your repaired phone.",
        ["I'm here to pick up my repaired phone."],
      ],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['r0062', 's0006', 's0021', 's0022', 's0023'],
}
