// 場面：クリニック・病院（上級向け。仕様書 18.6）。AI（Claude）による下書き
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'clinic',
    version: 1,
    name: '診所・醫院',
    level: 2,
    names: { ja: 'クリニック・病院', en: 'Clinic / hospital' },
  },
  phrases: [
    respond('r0068', '第一次來嗎？', ['對，第一次來。', '不是，我之前來過。'], {
      ja: ['初めてですか。', ['はい、初めてです。', 'いいえ、前に来たことがあります。']],
      en: ['Is this your first visit?', ["Yes, it's my first time.", "No, I've been here before."]],
    }),
    respond('r0069', '請給我健保卡。', ['好，在這裡。', '我沒有健保卡，可以自費嗎？'], {
      ja: [
        '健保カードをお願いします。',
        ['はい、これです。', '健保カードがないのですが、自費で受診できますか。'],
        '健保卡＝台湾の全民健康保険のカード。加入していない旅行者などは自費（全額自己負担）になる',
      ],
      en: [
        'Your health insurance card, please.',
        ['Here it is.', "I don't have an NHI card. Can I pay out of pocket?"],
        "健保卡 is Taiwan's National Health Insurance card. Visitors without it pay the full cost (自費).",
      ],
    }),
    respond('r0070', '要看哪一科？', ['我要看內科。', '我不知道，我發燒又咳嗽。'], {
      ja: [
        '何科を受診しますか。',
        ['内科をお願いします。', 'わかりません。熱があって咳も出ます。'],
        '內科（内科）・耳鼻喉科（耳鼻科）・皮膚科・牙科（歯科）など',
      ],
      en: [
        'Which department do you need?',
        ['Internal medicine, please.', "I'm not sure. I have a fever and a cough."],
        'Departments include 內科 (internal medicine), 耳鼻喉科 (ENT), 皮膚科 (dermatology) and 牙科 (dentistry).',
      ],
    }),
    respond('r0071', '請先量一下體溫。', ['好。'], {
      ja: ['先に体温を測ってください。', ['はい。']],
      en: ['Please take your temperature first.', ['OK.']],
    }),
    respond('r0072', '哪裡不舒服？', ['我喉嚨痛，還有一點發燒。', '我從昨天開始拉肚子。'], {
      ja: [
        'どこの具合が悪いですか。',
        ['喉が痛くて、少し熱もあります。', '昨日からお腹を壊しています。'],
      ],
      en: [
        "What's wrong?",
        ['I have a sore throat and a slight fever.', "I've had diarrhea since yesterday."],
      ],
    }),
    respond('r0073', '這樣的症狀多久了？', ['大概三天了。', '從昨天晚上開始。'], {
      ja: ['この症状はどのくらい続いていますか。', ['3日くらいです。', '昨日の夜からです。']],
      en: ['How long have you had these symptoms?', ['About three days.', 'Since last night.']],
    }),
    respond('r0074', '有沒有對什麼藥過敏？', ['沒有。', '我對盤尼西林過敏。'], {
      ja: [
        '何かの薬にアレルギーはありますか。',
        ['ありません。', 'ペニシリンのアレルギーがあります。'],
        '盤尼西林＝ペニシリン',
      ],
      en: [
        'Are you allergic to any medicine?',
        ['No.', "I'm allergic to penicillin."],
        '盤尼西林 = penicillin.',
      ],
    }),
    respond('r0075', '有在吃什麼藥嗎？', ['沒有。', '有，我在吃過敏的藥。'], {
      ja: ['今、何か薬を飲んでいますか。', ['いいえ。', 'はい、アレルギーの薬を飲んでいます。']],
      en: ['Are you taking any medication?', ['No.', "Yes, I'm taking allergy medicine."]],
    }),
    respond('r0076', '這個藥一天吃三次，飯後吃。', ['好，一次吃幾顆？', '好，我知道了。'], {
      ja: [
        'この薬は1日3回、食後に飲んでください。',
        ['はい。1回に何錠飲みますか。', 'はい、わかりました。'],
        '顆＝錠剤などを数える語',
      ],
      en: [
        'Take this medicine three times a day, after meals.',
        ['OK. How many pills each time?', 'OK, got it.'],
        '顆 is the counter for pills.',
      ],
    }),
    respond('r0077', '請到旁邊的櫃台領藥。', ['好，謝謝。'], {
      ja: [
        '隣のカウンターで薬を受け取ってください。',
        ['はい、ありがとう。'],
        'クリニックでは、院内で薬を受け取ることが多い',
      ],
      en: [
        'Please pick up your medicine at the counter next door.',
        ['OK, thank you.'],
        'Clinics usually hand out medicine on site.',
      ],
    }),
    respond('r0078', '掛號費一百五十元。', ['好。', '可以刷卡嗎？'], {
      ja: [
        '受付料は150元です。',
        ['はい。', 'カードで払えますか。'],
        '掛號費＝受診のたびに払う受付の料金。金額は医療機関によって違う',
      ],
      en: [
        'The registration fee is 150 dollars.',
        ['OK.', 'Can I pay by card?'],
        '掛號費 is a registration fee paid at each visit; the amount varies.',
      ],
    }),

    say('s0071', ['請問現在可以掛號嗎？', '不用預約可以看嗎？'], {
      ja: [
        '予約なしで今から受診できるか聞きたい',
        ['今から受付できますか。', '予約なしで診てもらえますか。'],
        '掛號＝受付（受診の登録）をする',
      ],
      en: [
        'You want to ask if you can see a doctor now without an appointment.',
        ['Can I register now?', 'Can I be seen without an appointment?'],
        '掛號 = to register for a consultation.',
      ],
    }),
    say('s0072', ['我沒有健保，我要自費。'], {
      ja: [
        '健康保険がないので、自費で受診したいと伝えたい',
        ['健保がないので、自費でお願いします。'],
      ],
      en: [
        'You want to say you have no health insurance and will pay yourself.',
        ["I don't have health insurance, so I'll pay out of pocket."],
      ],
    }),
    say('s0073', ['我發燒了。', '我好像發燒了。'], {
      ja: ['熱があると伝えたい', ['熱があります。', '熱があるみたいです。']],
      en: ['You want to say you have a fever.', ['I have a fever.', 'I think I have a fever.']],
    }),
    say('s0074', ['我咳嗽，喉嚨也很痛。'], {
      ja: ['咳が出て、喉も痛いと伝えたい', ['咳が出て、喉もとても痛いです。']],
      en: [
        'You want to say you have a cough and a sore throat.',
        ['I have a cough, and my throat really hurts.'],
      ],
    }),
    say('s0075', ['我拉肚子。', '我肚子不舒服。'], {
      ja: ['お腹を壊していると伝えたい', ['お腹を下しています。', 'お腹の調子が悪いです。']],
      en: [
        'You want to say you have an upset stomach.',
        ['I have diarrhea.', "My stomach doesn't feel well."],
      ],
    }),
    say('s0076', ['我頭很痛。'], {
      ja: ['頭が痛いと伝えたい', ['頭がとても痛いです。']],
      en: ['You want to say you have a headache.', ['I have a bad headache.']],
    }),
    say('s0077', ['這個藥要怎麼吃？', '可以再說一次怎麼吃嗎？'], {
      ja: [
        '薬の飲み方を聞きたい',
        ['この薬はどうやって飲みますか。', '飲み方をもう一度言ってもらえますか。'],
      ],
      en: [
        'You want to ask how to take the medicine.',
        ['How should I take this medicine?', 'Could you tell me again how to take it?'],
      ],
    }),
    say('s0078', ['可以開診斷證明嗎？'], {
      ja: [
        '診断書を書いてほしい',
        ['診断書を出してもらえますか。'],
        '診斷證明＝診断書。保険会社への請求などに使う',
      ],
      en: [
        'You want a medical certificate.',
        ['Could you issue a medical certificate?'],
        '診斷證明 = medical certificate, e.g. for insurance claims.',
      ],
    }),
    say('s0079', ['請問有會說英文的醫生嗎？', '請問有會說日文的醫生嗎？'], {
      ja: [
        '英語や日本語を話せる医師がいるか聞きたい',
        ['英語を話せるお医者さんはいますか。', '日本語を話せるお医者さんはいますか。'],
      ],
      en: [
        'You want to ask if a doctor speaks English or Japanese.',
        ['Is there a doctor who speaks English?', 'Is there a doctor who speaks Japanese?'],
      ],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['r0062', 's0006', 's0021', 's0022', 's0023'],
}
