import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './app/Layout'
import { HomePage } from './pages/HomePage'
import { ModePage } from './pages/ModePage'
import { SettingsPage } from './pages/SettingsPage'
import { SettingsProvider } from './settings/SettingsProvider'

// 単語データ画面は CSV 処理などを含み大きいため、開いたときに読み込む
const WordsPage = lazy(() => import('./pages/WordsPage').then((m) => ({ default: m.WordsPage })))

function LazyWordsPage() {
  const { t } = useTranslation()
  return (
    <Suspense fallback={<p className="muted">{t('common.loading')}</p>}>
      <WordsPage />
    </Suspense>
  )
}

/** ルート定義（仕様書 4.1）。GitHub Pages で直リンクが 404 にならないよう HashRouter を使う */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="mode/:modeId" element={<ModePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="words" element={<LazyWordsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </SettingsProvider>
  )
}
