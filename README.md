# tc-vocab

繁体中文（台湾華語）の単語学習ブラウザアプリ。仕様は [docs/SPEC.md](docs/SPEC.md) を参照。

## 開発

Node.js 24 以上が必要です。

```bash
npm install
npm run dev
```

| コマンド               | 内容                                     |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | 開発サーバーを起動                       |
| `npm run build`        | 型チェックと本番ビルド（`dist/` に出力） |
| `npm run preview`      | ビルド結果をローカルで確認               |
| `npm test`             | 単体テスト（Vitest）                     |
| `npm run lint`         | ESLint                                   |
| `npm run format`       | Prettier で整形                          |
| `npm run format:check` | 整形漏れの確認                           |

## デプロイ

`main` への push で GitHub Actions が lint・テスト・ビルドを行い、GitHub Pages に公開します
（`.github/workflows/deploy.yml`）。リポジトリの Settings → Pages で Source を「GitHub Actions」にしておく必要があります。
