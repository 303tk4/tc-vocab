import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './app/Layout'
import { HomePage } from './pages/HomePage'
import { ModePage } from './pages/ModePage'
import { SettingsPage } from './pages/SettingsPage'
import { WordsPage } from './pages/WordsPage'
import { SettingsProvider } from './settings/SettingsProvider'

/** ルート定義（仕様書 4.1）。GitHub Pages で直リンクが 404 にならないよう HashRouter を使う */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="mode/:modeId" element={<ModePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="words" element={<WordsPage />} />
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
