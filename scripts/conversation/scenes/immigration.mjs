// 場面：移民署（中級向け。仕様書 18.6、版 1.52）。AI（Claude）による下書き
// 居留の手続きは変わることがあるため、補足では期間・金額・書類の一覧を言い切らず「〜のことが多い」と書く
import { respond, say } from './helpers.mjs'

export default {
  scene: {
    id: 'immigration',
    version: 1,
    name: '移民署',
    level: 2,
    names: { ja: '移民署', en: 'Immigration Agency' },
  },
  phrases: [
    respond('r0098', '您好，要辦什麼？', ['我要延長居留證。', '我想問居留的事情。'], {
      ja: [
        'こんにちは、どのようなご用件ですか。',
        ['居留證を延長したいです。', '居留のことでお聞きしたいのですが。'],
        '移民署＝外国人の居留などを扱う役所。手続きの細部は変わることがあるため、最新の情報は移民署で確かめる',
      ],
      en: [
        'Hello, what can I help you with?',
        ["I'd like to extend my ARC.", "I'd like to ask about my residence status."],
        "移民署 is the National Immigration Agency, which handles foreigners' residence. Procedures can change, so check the latest information with the agency.",
      ],
    }),
    respond('r0099', '請先抽號碼牌。', ['好，在哪裡抽？', '好，謝謝。'], {
      ja: [
        '先に番号札を取ってください。',
        ['はい、どこで取りますか。', 'はい、ありがとうございます。'],
        '號碼牌＝番号札。機械で用件を選んで取ることが多い',
      ],
      en: [
        'Please take a number first.',
        ['OK, where do I get one?', 'OK, thank you.'],
        '號碼牌 is a queue ticket. You often choose your purpose on a machine to get one.',
      ],
    }),
    respond('r0100', '護照跟居留證給我。', ['好，在這裡。'], {
      ja: [
        'パスポートと居留證をください。',
        ['はい、これです。'],
        '居留證＝台湾に住む外国人の在留カード（ARC）',
      ],
      en: [
        'Your passport and ARC, please.',
        ['Here you are.'],
        '居留證 is the Alien Resident Certificate (ARC) for foreigners living in Taiwan.',
      ],
    }),
    respond('r0101', '有帶在學證明嗎？', ['有，在這裡。', '沒有，一定要帶嗎？'], {
      ja: [
        '在学証明書は持ってきましたか。',
        ['はい、これです。', 'いいえ。必ず必要ですか。'],
        '在學證明＝学校が出す在学証明書。学生の居留證の延長では求められることが多い',
      ],
      en: [
        'Did you bring your certificate of enrollment?',
        ['Yes, here it is.', 'No. Do I have to bring it?'],
        '在學證明 is a certificate of enrollment issued by your school. It is usually required to extend a student ARC.',
      ],
    }),
    respond('r0102', '你在哪裡念書？', ['我在大學的語言中心學中文。', '我是研究所的學生。'], {
      ja: [
        'どこで勉強していますか。',
        ['大学の語学センターで中国語を学んでいます。', '大学院の学生です。'],
        '華語中心＝大学に付属する、外国人向けの中国語の教室',
      ],
      en: [
        'Where do you study?',
        ["I'm learning Chinese at a university language center.", "I'm a graduate student."],
        '語言中心 is a university language center offering Mandarin classes for foreigners.',
      ],
    }),
    respond('r0103', '什麼時候畢業？', ['今年六月畢業。', '我已經畢業了。'], {
      ja: ['いつ卒業しますか。', ['今年の6月に卒業します。', 'もう卒業しました。']],
      en: ['When do you graduate?', ['I graduate this June.', "I've already graduated."]],
    }),
    respond('r0104', '畢業以後有什麼打算？', ['我想留在台灣找工作。', '我要回國工作。'], {
      ja: [
        '卒業後はどうするつもりですか。',
        ['台湾に残って仕事を探したいです。', '帰国して働きます。'],
      ],
      en: [
        'What are your plans after graduation?',
        ["I'd like to stay in Taiwan and look for a job.", "I'm going back to my country to work."],
      ],
    }),
    respond('r0105', '你的居留證什麼時候到期？', ['下個月到期。', '這個月底。'], {
      ja: ['居留證の期限はいつですか。', ['来月で切れます。', '今月末です。']],
      en: ['When does your ARC expire?', ['Next month.', 'At the end of this month.']],
    }),
    respond('r0106', '工作許可下來了嗎？', ['下來了，這是許可函。', '還沒，公司還在申請。'], {
      ja: [
        '就労の許可は下りましたか。',
        ['はい、下りました。これが許可書です。', 'まだです。会社が申請中です。'],
        '工作許可＝勞動部（労働省）が出す就労の許可。雇用する会社が申請することが多い。許可が出たあと、移民署で居留の目的を変える手続きをする',
      ],
      en: [
        'Has your work permit come through?',
        ["Yes, here's the approval letter.", 'Not yet. The company is still applying.'],
        '工作許可 is a work permit from the Ministry of Labor. The employer usually applies for it. After it is granted, you change the purpose of your residence at the Immigration Agency.',
      ],
    }),
    respond('r0107', '公司的名稱跟地址是？', ['都寫在這份文件上。', '我寫給你。'], {
      ja: ['会社の名前と住所は？', ['どちらもこの書類に書いてあります。', '書いてお渡しします。']],
      en: [
        "What's the company's name and address?",
        ["They're both on this document.", "I'll write them down for you."],
      ],
    }),
    respond('r0108', '你的地址有沒有變？', ['沒有變。', '有，我上個月搬家了。'], {
      ja: [
        '住所は変わっていませんか。',
        ['変わっていません。', 'はい、先月引っ越しました。'],
        '引っ越したときは、住所の変更の届け出が必要なことが多い',
      ],
      en: [
        'Has your address changed?',
        ["No, it hasn't.", 'Yes, I moved last month.'],
        'If you move, you usually need to report your new address.',
      ],
    }),
    respond('r0109', '照片要最近拍的。', ['好，我明天再拿來。', '附近哪裡可以拍照？'], {
      ja: [
        '写真は最近撮ったものが必要です。',
        ['わかりました。明日また持ってきます。', 'この近くで写真を撮れるところはありますか。'],
        '写真の大きさや撮った時期に決まりがあることが多い',
      ],
      en: [
        'The photo needs to be a recent one.',
        ["OK, I'll bring one tomorrow.", 'Where can I get photos taken nearby?'],
        'There are usually rules on the size of the photo and when it was taken.',
      ],
    }),
    respond('r0110', '這份文件要補件。', ['要補什麼？', '可以用網路傳嗎？'], {
      ja: [
        'この書類は追加の提出が必要です。',
        ['何を出せばいいですか。', 'ネットで送ってもいいですか。'],
        '補件＝不足している書類をあとから出すこと',
      ],
      en: [
        'You need to submit more documents for this.',
        ['What do I need to submit?', 'Can I send it online?'],
        '補件 means submitting missing documents afterwards.',
      ],
    }),
    respond('r0111', '請先去那邊繳費。', ['好，可以刷卡嗎？', '請問要繳多少？'], {
      ja: [
        '先にあちらで手数料を払ってください。',
        ['はい。カードで払えますか。', 'いくら払えばいいですか。'],
        '規費＝手続きの手数料',
      ],
      en: [
        'Please go over there and pay the fee first.',
        ['OK. Can I pay by card?', 'How much do I need to pay?'],
        '規費 is the processing fee.',
      ],
    }),
    respond('r0112', '大概要七個工作天。', ['好，要怎麼領？', '可以快一點嗎？我下個月要出國。'], {
      ja: [
        'だいたい7営業日かかります。',
        ['わかりました。どうやって受け取りますか。', '早くなりませんか。来月出国するんです。'],
        '工作天＝営業日。かかる日数は手続きや時期によって違う',
      ],
      en: [
        'It takes about seven working days.',
        ['OK, how do I pick it up?', "Could it be faster? I'm leaving the country next month."],
        '工作天 means working days. How long it takes depends on the procedure and the season.',
      ],
    }),
    respond('r0113', '新的居留證要自己來拿，還是寄給你？', ['我自己來拿。', '請寄給我。'], {
      ja: [
        '新しい居留證は、ご自分で取りに来ますか、それとも郵送しますか。',
        ['自分で取りに来ます。', '郵送してください。'],
        '窓口での受け取りか、書留での郵送を選べることが多い',
      ],
      en: [
        'Will you pick up the new ARC yourself, or shall we mail it to you?',
        ["I'll come and pick it up.", 'Please mail it to me.'],
        'You can usually choose to pick it up in person or have it sent by registered mail.',
      ],
    }),
    respond('r0114', '這個可以在網路上申請。', ['是嗎？要在哪裡申請？', '好，我回去試試看。'], {
      ja: [
        'これはネットで申請できますよ。',
        ['そうなんですか。どこで申請するんですか。', 'わかりました。帰ってやってみます。'],
        '居留證の延長などは、オンラインで申請できる手続きもある',
      ],
      en: [
        'You can apply for this online.',
        ['Really? Where do I apply?', "OK, I'll try it when I get home."],
        'Some procedures, such as extending an ARC, can be done online.',
      ],
    }),
    say('s0096', ['我的居留證快到期了，我想延長。'], {
      ja: [
        '居留證がもうすぐ切れるので、延長したいと伝えたい',
        ['居留證の期限がもうすぐなので、延長したいです。'],
      ],
      en: [
        'You want to say your ARC is about to expire and you want to extend it.',
        ["My ARC is about to expire. I'd like to extend it."],
      ],
    }),
    say('s0097', ['我畢業以後想留在台灣找工作，要辦什麼手續？'], {
      ja: [
        '卒業後も台湾で仕事を探したいので、どんな手続きが要るか聞きたい',
        ['卒業後も台湾に残って仕事を探したいのですが、どんな手続きが必要ですか。'],
        '卒業した留学生が、仕事を探すために居留を延ばせる制度がある。条件や期間は移民署で確かめる',
      ],
      en: [
        'You want to ask what you need to do to stay in Taiwan and look for work after graduating.',
        ["I'd like to stay in Taiwan to look for a job after I graduate. What do I need to do?"],
        'Graduates can extend their residence to look for work. Check the conditions and duration with the Immigration Agency.',
      ],
    }),
    say('s0098', ['我找到工作了，居留證要怎麼換？'], {
      ja: [
        '仕事が決まったので、居留證の切り替え方を聞きたい',
        ['仕事が決まったのですが、居留證はどうやって切り替えますか。'],
      ],
      en: [
        'You want to ask how to change your ARC now that you have found a job.',
        ["I've found a job. How do I change my ARC?"],
      ],
    }),
    say('s0099', ['需要準備哪些文件？'], {
      ja: ['どんな書類を用意すればよいか聞きたい', ['どんな書類を用意すればいいですか。']],
      en: [
        'You want to ask which documents you need to prepare.',
        ['Which documents do I need to prepare?'],
      ],
    }),
    say('s0100', ['這張表格要怎麼填？', '可以教我怎麼填嗎？'], {
      ja: [
        '申請書の書き方を教えてほしい',
        ['この用紙はどう書けばいいですか。', '書き方を教えてもらえますか。'],
      ],
      en: [
        'You want them to show you how to fill in the form.',
        ['How do I fill in this form?', 'Could you show me how to fill it in?'],
      ],
    }),
    say('s0101', ['新的居留證還沒拿到以前，可以出國嗎？'], {
      ja: [
        '新しい居留證を受け取る前に出国できるか聞きたい',
        ['新しい居留證を受け取る前に、出国してもいいですか。'],
      ],
      en: [
        'You want to ask if you can leave the country before you get your new ARC.',
        ['Can I leave the country before I get my new ARC?'],
      ],
    }),
    say('s0102', ['我搬家了，想改地址。'], {
      ja: ['引っ越したので、住所を変えたいと伝えたい', ['引っ越したので、住所を変更したいです。']],
      en: [
        'You want to say you have moved and need to change your address.',
        ["I've moved and would like to change my address."],
      ],
    }),
    say('s0103', ['辦好以後會怎麼通知我？'], {
      ja: [
        '手続きが済んだら、どう知らせてもらえるか聞きたい',
        ['手続きが済んだら、どうやって連絡をもらえますか。'],
      ],
      en: [
        'You want to ask how they will let you know when it is done.',
        ["How will you let me know when it's ready?"],
      ],
    }),
  ],
  // ほかの場面の項目（18.5。同じセリフは重ねて作らない）
  uses: ['s0021', 's0022', 's0023'],
}
