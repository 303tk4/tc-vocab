/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// アプリの版（FR-SET-06）。package.json の version を正本とする（仕様書 12.2）
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  // GitHub Pages の公開パス（https://<user>.github.io/tc-vocab/）。仕様書 12.2
  base: '/tc-vocab/',
  plugins: [
    react(),
    // PWA（仕様書 12.1）
    VitePWA({
      // 更新は利用者の操作で反映する（FR-PWA-03）。登録は src/app/UpdatePrompt.tsx で行う
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        // FR-PWA-02
        name: '學中文 tc-vocab',
        short_name: '學中文',
        description: '繁体中文（台湾華語）の単語学習アプリ',
        lang: 'zh-TW',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f4ef',
        theme_color: '#b4232f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // アプリ本体とサンプル単語を事前キャッシュする（FR-PWA-01）
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        // 単語パッケージは使うときに読み込み、事前キャッシュに含めない（仕様書 16.5）
        globIgnores: ['packs/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      // 開発サーバーでは Service Worker を使わない
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // テストでは Service Worker を登録しない
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwa-register-stub.ts', import.meta.url),
      ),
    },
  },
})
