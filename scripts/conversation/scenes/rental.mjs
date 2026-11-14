// 場面：部屋探し・賃貸（中級向け。仕様書 18.6、版 1.52）。AI（Claude）による下書き
// 家賃や契約の条件は物件によって違うため、補足では「〜のことが多い」と書き、物件サイトの名前は出さない
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'rental',
    version: 1,
    name: '租屋',
    level: 2,
    names: { ja: '部屋探し・賃貸', en: 'Renting a room' },
  },
  phrases: [
    respond('r0115', '你好，是要來看房子的嗎？', ['對，我昨天有打電話。', '對，我想看這間套房。'], {
      ja: [
        'こんにちは、部屋を見に来た方ですか。',
        ['はい、昨日電話した者です。', 'はい、この套房を見たいです。'],
        '套房＝トイレ・シャワー付きの個室。雅房＝トイレ・シャワーが共用の個室。整層＝一戸まるごと',
      ],
      en: [
        'Hello, are you here to see the place?',
        ['Yes, I called yesterday.', "Yes, I'd like to see this studio."],
        '套房 is a room with its own bathroom, 雅房 a room with a shared bathroom, and 整層 a whole apartment.',
      ],
    }),
    respond('r0116', '你是學生還是上班族？', ['我是學生。', '我在上班。'], {
      ja: ['学生さんですか、それとも会社員ですか。', ['学生です。', '働いています。']],
      en: ['Are you a student or do you work?', ["I'm a student.", 'I work.']],
    }),
    respond('r0117', '你一個人住嗎？', ['對，一個人。', '我跟朋友兩個人住。'], {
      ja: ['お一人で住みますか。', ['はい、一人です。', '友達と二人で住みます。']],
      en: [
        'Will you be living alone?',
        ['Yes, just me.', "I'll be living with a friend, so two of us."],
      ],
    }),
    respond('r0118', '你打算住多久？', ['至少一年。', '大概半年，可以嗎？'], {
      ja: [
        'どのくらい住むつもりですか。',
        ['少なくとも1年です。', '半年くらいですが、大丈夫ですか。'],
        '契約は1年単位のことが多い',
      ],
      en: [
        'How long are you planning to stay?',
        ['At least a year.', 'About six months. Is that OK?'],
        'Leases are usually for one year.',
      ],
    }),
    respond('r0119', '有沒有養寵物？', ['沒有。', '我有一隻貓，可以嗎？'], {
      ja: ['ペットは飼っていますか。', ['いいえ。', '猫を1匹飼っていますが、大丈夫ですか。']],
      en: ['Do you have any pets?', ['No.', 'I have a cat. Is that OK?']],
    }),
    respond('r0120', '你會抽菸嗎？', ['不會。', '會，可是我都在外面抽。'], {
      ja: ['たばこは吸いますか。', ['吸いません。', '吸いますが、いつも外で吸います。']],
      en: ['Do you smoke?', ['No.', 'Yes, but I always smoke outside.']],
    }),
    respond(
      'r0121',
      '房租一個月一萬二，押金兩個月。',
      ['房租有包含管理費嗎？', '押金可以一個月嗎？'],
      {
        ja: [
          '家賃は月1万2千元、敷金は2か月分です。',
          ['家賃に管理費は含まれていますか。', '敷金を1か月分にしてもらえますか。'],
          '押金＝敷金。家賃の2か月分のことが多く、退去のときに返してもらう',
        ],
        en: [
          'The rent is 12,000 a month, and the deposit is two months.',
          ['Does the rent include the management fee?', 'Could the deposit be one month?'],
          "押金 is the security deposit. It is often two months' rent and is returned when you move out.",
        ],
      },
    ),
    respond('r0122', '電費一度五塊。', ['是照台電的算嗎？', '冷氣的電費也是這樣算嗎？'], {
      ja: [
        '電気代は1度5元です。',
        ['電力会社の料金どおりですか。', 'エアコンの電気代も同じ計算ですか。'],
        '度＝電気の単位（kWh）。部屋ごとのメーターで、貸主が1度あたりの料金を決めることが多い。台電＝台湾の電力会社',
      ],
      en: [
        'Electricity is 5 per unit.',
        ["Is it the power company's rate?", 'Is the air conditioning charged the same way?'],
        "度 is a kilowatt-hour. Landlords often set their own rate per unit using each room's meter. 台電 is Taiwan's power company.",
      ],
    }),
    respond('r0123', '水費跟網路都包含在房租裡。', ['太好了。', '網路速度怎麼樣？'], {
      ja: [
        '水道代とネットは家賃に含まれています。',
        ['よかったです。', 'ネットの速度はどうですか。'],
      ],
      en: ['Water and internet are included in the rent.', ['Great.', 'How fast is the internet?']],
    }),
    respond('r0124', '這裡不能開伙。', ['那可以用電鍋嗎？', '好，我知道了。'], {
      ja: [
        'ここでは料理はできません。',
        ['では、電鍋は使えますか。', 'はい、わかりました。'],
        '開伙＝部屋で料理をすること。禁止の物件も多い。電鍋＝台湾の家庭でよく使う電気の蒸し調理器',
      ],
      en: [
        'No cooking is allowed here.',
        ['Then can I use an electric cooker?', 'OK, I understand.'],
        '開伙 means cooking in your room; many places do not allow it. 電鍋 is the electric steamer-cooker found in most Taiwanese homes.',
      ],
    }),
    respond('r0125', '租約簽一年。', ['好。', '如果提早搬走，會怎麼樣？'], {
      ja: ['契約は1年です。', ['わかりました。', 'もし途中で引っ越したら、どうなりますか。']],
      en: ['The lease is for one year.', ['OK.', 'What happens if I move out early?']],
    }),
    respond('r0126', '提早解約的話，押金不退。', ['要提早多久說？', '好，我了解了。'], {
      ja: [
        '途中で解約したら、敷金は返しません。',
        ['どのくらい前に言えばいいですか。', 'はい、わかりました。'],
        '途中で解約したときの扱いは契約によって違う。契約書で確かめる',
      ],
      en: [
        "If you end the lease early, the deposit won't be returned.",
        ['How much notice do I need to give?', 'OK, I understand.'],
        'What happens when you end a lease early depends on the contract. Check it before signing.',
      ],
    }),
    respond('r0127', '你什麼時候可以搬進來？', ['下個月一號。', '越快越好。'], {
      ja: ['いつ入居できますか。', ['来月1日です。', 'できるだけ早くがいいです。']],
      en: ['When can you move in?', ['On the first of next month.', 'As soon as possible.']],
    }),
    respond('r0128', '垃圾要自己拿去倒。', ['好，我知道了。', '垃圾要怎麼分類？'], {
      ja: [
        'ごみは自分で出しに行ってください。',
        ['はい、わかりました。', 'ごみはどう分別しますか。'],
        '建物にごみ置き場が無く、ごみ収集車に直接渡す物件も多い',
      ],
      en: [
        'You have to take out the rubbish yourself.',
        ['OK, I understand.', 'How should I sort the rubbish?'],
        'Many buildings have no rubbish room, and you hand your rubbish directly to the garbage truck.',
      ],
    }),
    say('s0104', ['我想看房子，什麼時候方便？'], {
      ja: [
        '部屋を見たいので、都合のよい時間を聞きたい',
        ['部屋を見たいのですが、いつがご都合よろしいですか。'],
      ],
      en: [
        'You want to see the place and ask when is convenient.',
        ["I'd like to see the place. When would be convenient?"],
      ],
    }),
    say('s0105', ['房租包含哪些費用？'], {
      ja: ['家賃に何が含まれているか聞きたい', ['家賃には何が含まれていますか。']],
      en: ['You want to ask what the rent includes.', ['What does the rent include?']],
    }),
    say('s0106', ['電費怎麼算？'], {
      ja: ['電気代の計算の仕方を聞きたい', ['電気代はどう計算しますか。']],
      en: ['You want to ask how electricity is charged.', ['How is electricity charged?']],
    }),
    say('s0107', ['可以養寵物嗎？'], {
      ja: ['ペットを飼えるか聞きたい', ['ペットを飼ってもいいですか。']],
      en: ['You want to ask if pets are allowed.', ['Are pets allowed?']],
    }),
    say('s0108', ['有洗衣機嗎？', '衣服可以曬在哪裡？'], {
      ja: [
        '洗濯機や洗濯物を干す場所について聞きたい',
        ['洗濯機はありますか。', '洗濯物はどこに干せますか。'],
      ],
      en: [
        'You want to ask about a washing machine and where to dry clothes.',
        ['Is there a washing machine?', 'Where can I hang my laundry?'],
      ],
    }),
    say('s0109', ['東西壞了要找誰修？'], {
      ja: [
        '設備が壊れたら誰に修理を頼むか聞きたい',
        ['物が壊れたら、誰に修理を頼めばいいですか。'],
      ],
      en: [
        'You want to ask who to contact if something breaks.',
        ['Who do I contact if something breaks?'],
      ],
    }),
    say('s0110', ['附近交通方便嗎？'], {
      ja: ['近くの交通の便を聞きたい', ['この近くは交通の便がいいですか。']],
      en: [
        'You want to ask if public transport nearby is convenient.',
        ['Is public transport convenient around here?'],
      ],
    }),
    say('s0111', ['合約可以先給我看嗎？'], {
      ja: ['先に契約書を見たいと伝えたい', ['先に契約書を見せてもらえますか。']],
      en: ['You want to read the lease before signing.', ['Could I see the lease first?']],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['s0021', 's0022', 's0023'],
}
