import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { startInstallPromptCapture } from './app/installPrompt'
import './i18n'
import './styles/tokens.css'
import './styles/global.css'

// ホーム画面への追加の知らせは起動直後に来るため、描画より前に受け始める（FR-PWA-05）
startInstallPromptCapture()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
