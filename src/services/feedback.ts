// 開発者へのフィードバック（仕様書 10.3、FR-SET-05）。
// アプリ自身は送信せず、利用者が押したリンクでブラウザがフォームを開くだけにする（NFR-06）

export interface FeedbackForm {
  /** フォームの URL。空ならフィードバックの部分を表示しない */
  url: string
  /** あらかじめ書き込む欄の ID（`entry.123…` の数字）。フォームに欄が無ければ省く */
  entries: { version?: string; language?: string }
}

/** 公開しているフォーム（Google フォーム「學中文 User Feedback 意見回饋」） */
export const FEEDBACK_FORM: FeedbackForm = {
  url: 'https://docs.google.com/forms/d/e/1FAIpQLSeiO5LCQjjzS3lmjQ1CKYw0En-4tTBBFtqjitIAr_z1IxO65A/viewform',
  // 版と言語の欄はまだ無い。欄を足したら、事前入力したリンクの entry の数字をここに書く
  entries: {},
}

/**
 * フォームを開く URL を作る。付けるのはアプリの版と画面の言語だけで、
 * 単語や学習の記録、端末の情報は付けない（仕様書 10.3）
 */
export function buildFeedbackUrl(
  form: FeedbackForm,
  info: { version: string; language: string },
): string | null {
  if (!form.url) return null
  const url = new URL(form.url)
  const { version, language } = form.entries
  if (version || language) {
    url.searchParams.set('usp', 'pp_url')
    if (version) url.searchParams.set(`entry.${version}`, info.version)
    if (language) url.searchParams.set(`entry.${language}`, info.language)
  }
  return url.toString()
}
