# tc-vocab

台湾華語（繁体字）の単語を学ぶブラウザアプリ。React + TypeScript で作り、GitHub Pages で公開している。

- 公開 URL：https://303tk4.github.io/tc-vocab/
- 仕様の正本は [docs/SPEC.md](docs/SPEC.md)。このファイルは要点と作業の決まりだけをまとめたもの。食い違ったときは SPEC.md を優先する。

## 作業の進め方

- **実装は SPEC.md に従う。** 仕様にない機能の追加や、仕様と異なる実装をする場合は、先に SPEC.md の変更案をユーザーに示し、承認を得る。
- **SPEC.md を変更したら**、表紙の「版」を上げ、17章「改訂履歴」に1行追加する。要件 ID（例：`FR-WORDS-08`）は既存の番号を変えずに追番する。
- 実装は15章のマイルストーン（M0, M1, M2, M2.5, M3, M3.5, M4, M4.5, M4.6, M4.7, M5, M5.1, M5.2, M5.3, M6 …）の単位で進める。完了済みは M0〜M5.3、M6（アプリの版 1.8.1）。次は15章の「以降」（クイズモードなどの機能追加）。各マイルストーンはユーザーの指示があってから始める。
- コード中のコメント、テスト名、コミットメッセージは日本語で書く。コメントでは、関係する要件 ID や仕様書の節番号を示す（例：`// 取り込みの計画（仕様書 9.3）`）。
- **並行で動かすセッションは、必ず自分の作業用フォルダ（git worktree）で作業する。** 同じフォルダを複数のセッションで同時に書き換えない。作業が終わったら（ブランチを統合した、または不要になったら）、使った worktree の片付け（`git worktree remove` とブランチの削除）を人間に促すか、承認を得て Claude が行う。

## 技術スタック

| 用途           | 採用技術                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------- |
| ビルド         | Vite                                                                                            |
| UI             | React 19 + TypeScript 6.0（`strict`）。TypeScript 7 は typescript-eslint が未対応のため使わない |
| ルーティング   | React Router（HashRouter）                                                                      |
| データ         | IndexedDB + Dexie。画面への反映は `dexie-react-hooks` の `useLiveQuery`                         |
| 多言語化       | i18next + react-i18next（ja / zh-TW / en）                                                      |
| CSV            | Papa Parse                                                                                      |
| 仮想スクロール | TanStack Virtual（`@tanstack/react-virtual`）                                                   |
| スタイル       | CSS Modules + CSS カスタムプロパティ（`src/styles/tokens.css`）。UI ライブラリは使わない        |
| テスト         | Vitest + Testing Library（jsdom、`fake-indexeddb`）。E2E は Playwright + `@axe-core/playwright` |
| リント・整形   | ESLint（typescript-eslint）+ Prettier                                                           |
| CI / デプロイ  | GitHub Actions（`.github/workflows/deploy.yml`）→ GitHub Pages                                  |
| PWA            | vite-plugin-pwa（Workbox）                                                                      |

依存パッケージを追加するときは、SPEC.md 3.2 の表にも追記する。

## コマンド

```bash
npm run dev            # 開発サーバー
npm run lint           # ESLint
npm run format         # Prettier で整形（format:check は確認のみ）
npm test               # Vitest（一度だけ実行）
npm run build          # 型チェック（tsc -b）+ ビルド
npm run size           # 初回表示の JS の大きさ（gzip 後 200KB 以下、NFR-02）
npm run test:e2e       # E2E（Playwright。先に build。Chrome だけなら `npx playwright test --project=chromium`）
npm run preview        # ビルド結果の確認（/tc-vocab/ 配下）
```

## コミット前のチェック（必須）

コミットの前に次をすべて通す。CI（`deploy.yml`）も同じ順で実行し、1つでも失敗すると公開されない。

```bash
npm run lint && npm run format:check && npm test && npm run build && npm run size && npm run test:e2e
```

- 失敗したまま、またはチェックを省いてコミットしない。
- E2E は `e2e/` にあり、パソコンの Chrome（`chromium`）と iPhone の代わりの WebKit（`mobile-webkit`）で動かす。CI は `chromium` だけ。画面の文言や操作を変えたら、E2E の該当箇所も直す。確かめ方と結果は SPEC.md 13.1。
- 画面に関わる変更は、`npm run build` → `npm run preview` で実際に動かして確認する。幅は 375px / 768px / 1280px で、横スクロールが出ないこと、コンソールにエラーがないことを見る。
- **コミットと push は、ユーザーの承認を得てから行う。**
- コミットメッセージは日本語。マイルストーンの完了時は `M3: 暗記カードの学習画面と SRS を追加` のように番号を先頭に付ける。
- `.claude/` はローカル用の設定のためコミットしない。
- 利用者に見える変更を公開するときは、`package.json` の `version` を上げ（機能の追加は 1.x.0、修正は 1.0.x。SPEC.md 12.2）、main に統合したあとで `v1.1.0` のようなタグを付ける。版は設定画面の「このアプリについて」に表示される。

## ディレクトリ規約

```
src/
├─ main.tsx, App.tsx      # エントリーポイントとルート定義（ページは必要に応じて React.lazy）
├─ app/                   # レイアウト、更新の通知（PWA）
├─ pages/                 # 画面（HomePage, ModePage, SettingsPage, WordsPage）
│  └─ words/              # 単語データ画面だけで使う部品（一覧、ダイアログ、検索）
├─ modes/                 # 学習モード（プラグイン）。types.ts・registry.ts、モードごとのフォルダ、共通の部品 shared/（SRS・出題順）
├─ db/
│  ├─ schema.ts           # Dexie のスキーマ。変更時は version を上げて upgrade() で移行する
│  └─ repos/              # DB 操作はここに集約（words.ts, tags.ts, progress.ts）
├─ io/                    # インポート・エクスポートと検証（DB に依存しない純粋な処理）
├─ i18n/                  # i18next の初期化と共通の文言（locales/ja.json, zh-TW.json, en.json）
├─ services/              # 読み上げ、サンプル単語など
├─ settings/              # 設定の型・Provider
├─ components/            # 複数の画面で使う UI 部品（Dialog, TagChips, TagField, WordTagsDialog, SegmentedControl, icons）
├─ hooks/                 # 共通のフック
├─ styles/                # tokens.css（テーマ変数）, global.css
├─ types/                 # Word, Progress などの型
└─ test/                  # テストの共通設定（setup.ts）とフィクスチャ（fixtures.ts）
public/samples/starter.json  # サンプル単語（すべてに「サンプル」タグ）
docs/SPEC.md                 # 仕様書
e2e/                         # Playwright の E2E テスト（flows, offline, a11y, keyboard, perf）
scripts/check-size.mjs       # 初回表示の JS の大きさの確認
scripts/licenses-plugin.ts   # ライブラリのライセンスの一覧 licenses.json を書き出す（FR-SET-08）
LICENSE                      # MIT License（プログラム）。単語集の条件は public/packs/README.md
scripts/build-icons.mjs      # public/favicon.svg から PWA のアイコン画像（PNG）を作る
scripts/conversation/        # 場面別会話のデータを作る（build.mjs。下書きは scenes/、多音字の読みは readings.mjs。仕様書 18.6）
```

- テストは対象ファイルの隣に `*.test.ts(x)` として置く。
- 1つの画面でしか使わない部品は `pages/<画面名>/` に置き、複数の画面で使うものだけを `components/` に置く。
- 画面やモードのコンポーネントから Dexie（`db`）を直接触らない。`db/repos/` の関数を使う。
- 判定や変換のロジックは React から切り離した純粋な関数にして、単体テストを書く（例：`io/importer.ts` の `planImport`）。

## 実装の決まり

- **文言**はすべて i18n を通す。共通の文言は `src/i18n/locales/` の3ファイルに、同じキーで追加する。キーが3言語でそろっていることは `src/i18n/locales.test.ts` が確認する。
- **初回表示の JS は gzip 後 200KB 以下**（NFR-02）。大きな依存（Papa Parse など）を使う画面や処理は `React.lazy` か動的 `import()` で遅らせる。`npm run size` で確認する。
- **1万語で単語一覧の表示と学習の開始が1秒以内**（NFR-01）。全件を読む処理を足したら `e2e/perf.spec.ts` で確かめる。
- **DB への書き込みに失敗したら画面に通知**し、データを壊さない（NFR-07）。複数の表や行にまたがる書き込みは `db.transaction` で1つにまとめる。
- **アクセシビリティ**（NFR-03・04）：キーボードだけで操作できるようにする。押せる要素は 44px 以上にする。中国語の部分には `lang="zh-TW"`（拼音は `lang="zh-Latn-pinyin"`）を付ける。アイコンだけのボタンには `aria-label` を付け、見えている文字があるリンクやボタンには `aria-label` で別の名前を付けない（読み上げ名は見えている文字から始める）。画面を足したら `usePageTitle` でタブの題名を付け、`e2e/a11y.spec.ts` に加える。
- **レスポンシブ**：スマホ（〜599px）、タブレット、PC の3区分で考える。スマホではダイアログを画面下部に出し、ボタンを横いっぱいに並べる。
- **外部への通信はしない**（NFR-06）。解析・広告・計測、CDN からの読み込みは使わない。
- **中国語の内容は台湾の規範に従う**：繁体字、教育部《國語辭典》の読み、台湾の筆順。並べ替えは `zh-Hant-TW` の照合順序で行う。
- **タグ**：独立した「単語帳」は作らず、タグで分類する。1語に 20 件まで、1つ 50 文字まで。`;` は使えない（CSV のタグ区切りのため）。検証は `io/validate.ts` の `tagError` に集約している。
- **モーダル**は `components/Dialog.tsx`（ネイティブの `<dialog>`）を使う。

## 新しい学習モードの追加方法

学習モードはプラグインとして追加する（SPEC.md 7章）。コア（ページ・DB・ルーティング）は変更しない。例として `quiz` モードを追加する手順を示す。

1. **仕様を書く**：SPEC.md 7.3 の表にモードを追加し、暗記カード（8章）と同じ形でモードの仕様の章を設ける。ユーザーの承認を得てから実装する。
2. **フォルダを作る**：`src/modes/flashcard/` を手本にする。
   ```
   src/modes/quiz/
   ├─ index.ts        # defineMode<QuizOptions>({ ... }) で StudyMode を定義して export
   ├─ options.ts      # 準備画面のオプションの型と選択肢
   ├─ Setup.tsx       # 準備画面のオプション（任意）。default export
   ├─ Session.tsx     # 学習セッション（必須）。default export
   ├─ SettingsPanel.tsx  # 設定画面に出すモード別設定（任意）。default export
   ├─ Result.tsx      # 結果画面の集計の表示（任意）。default export
   ├─ *.ts / *.test.ts   # 出題や採点のロジックと、その単体テスト
   └─ locales/        # ja.json, zh-TW.json, en.json（同じキー）
   ```
3. **`index.ts` で定義する**：
   - `id` は `^[a-z][a-z0-9-]*$` の形にする。進捗や設定の保存キーにもなるので、公開後は変えない。
   - `titleKey` と `descriptionKey` は、そのモードの locales 内のキー。
   - `icon` を `components/icons.tsx` に追加する。
   - `minWords`（開始に必要な最少単語数）、`requiredFields`（出題に必須の項目）、`defaultOptions` を指定する。
   - 1回に出す数を決めて学習するモードは `sessionSize: { defaultValue }` を指定する。準備画面の「学習を始める」の下に「一回の出題数」の欄をコアが置き、`SessionProps.sessionSize` で値を渡す。単位の文言はモードの locales のキー `sessionSizeUnit`（FR-PLUG-08）。
   - 単語ではなくモード自身の内容を出題するモード（例：`conversation`）は `usesWords: false` とする。タグの選択と単語数の条件は使われず、開始できるかは `Setup` が `onCanStartChange` で知らせる。進捗の ID は `itemProgressId(modeId, itemId)`（`item:` で始まる。仕様書 6.2・FR-PLUG-07）。
   - `Setup`・`Session`・`SettingsPanel`・`Result` は必ず `lazy(() => import('./Session'))` の形で遅延読み込みにする（FR-PLUG-02）。
   - `locales: { ja, 'zh-TW': zhTW, en }` を渡す。文言は名前空間 `mode.quiz` に登録されるので、コンポーネントでは `useTranslation('mode.quiz')` で使う（FR-PLUG-03）。
4. **登録する**：`src/modes/registry.ts` の `modes` 配列に追加する。並び順がホームでの表示順になる。これだけでホームに表示され、`#/mode/quiz` で開ける（FR-PLUG-01）。
5. **データの扱い**（FR-PLUG-04・05）：
   - モードから `db` や `db/repos/` を直接使わない。単語は `SessionProps.words`（準備画面の条件で絞り込み済み）で受け取る。進捗は `SessionProps.progress`（`ProgressStore`。modeId で自動的に区切られる）で読み書きする。
   - 読み上げ、共通設定、単語のタグの読み書き（`services.tags`）は `SessionProps.services` から使う。1語のタグ編集には `components/WordTagsDialog.tsx` を使える。
   - 終了時は `onFinish({ summary })`、中断時は `onAbort()` を呼ぶ。セッション履歴の保存や結果画面への遷移は `ModePage` が行う。
   - モード固有の設定は `settings` テーブルのキー `mode.<modeId>.*` に保存する。読み書きは `ModeSettingsStore`（セッションでは `SessionProps.modeSettings`、SettingsPanel では props の `settings`）を使う。キーには `mode.<modeId>.` が自動で付く。
6. **確認する**：
   - `src/modes/registry.test.ts`（ID の重複と形式）と `src/i18n/locales.test.ts`（3言語のキー）は、追加したモードも自動で検査する。
   - モードのロジックには単体テストを書く。
   - 「コミット前のチェック」をすべて通し、`npm run preview` でホームから開いて学習できることを確かめる。
