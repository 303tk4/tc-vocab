import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { startInstallPromptCapture } from './app/installPrompt'
import { i18nReady } from './i18n'
import './styles/tokens.css'
import './styles/global.css'

// ホーム画面への追加の知らせは起動直後に来るため、描画より前に受け始める（FR-PWA-05）
startInstallPromptCapture()

// 表示言語の文言を読み終えてから描画する（仕様書 16.8）
void i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
