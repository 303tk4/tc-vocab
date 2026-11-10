import { defineConfig, devices } from '@playwright/test'

// E2E テスト（仕様書 13.1）。`npm run build` の結果を `vite preview` で配信して確かめる
const PORT = 4174
const isCI = !!process.env.CI
const chrome = {
  ...devices['Desktop Chrome'],
  // 開発機では入っている Chrome を使い、ブラウザのダウンロードを省く
  ...(isCI ? {} : { channel: 'chrome' }),
}
const PERF = /perf\.spec\.ts/

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['github']] : 'list',
  // expect の待ち時間（既定 5 秒）を少し伸ばす。並べて流すと、読み込みの遅い画面（出典とライセンスなど）が
  // まれに間に合わないため
  expect: { timeout: 8_000 },
  use: {
    baseURL: `http://localhost:${PORT}/tc-vocab/`,
    locale: 'ja-JP',
    trace: 'retain-on-failure',
    // Service Worker はオフラインの確かめ（offline.spec.ts）でだけ使う
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: chrome, testIgnore: PERF },
    {
      // iPhone の Safari の代わり（仕様書 3.1）。CI では動かさない
      name: 'mobile-webkit',
      use: { ...devices['iPhone 15'] },
      testIgnore: PERF,
    },
    {
      // 1万語での性能（NFR-01）。ほかのテストと CPU を取り合わないよう、
      // `npm run test:e2e` では、ほかのテストが終わってから1つだけで動かす
      name: 'perf',
      use: chrome,
      testMatch: PERF,
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/tc-vocab/`,
    reuseExistingServer: !isCI,
  },
})
