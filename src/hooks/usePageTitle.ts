import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * ブラウザのタブの題名を画面に合わせる（NFR-03・04、WCAG 2.4.2）。
 * 読み上げソフトが画面の移動を伝えられるようにする。title を省くとアプリ名だけにする
 */
export function usePageTitle(title?: string) {
  const { t } = useTranslation()
  const appName = t('app.name')
  useEffect(() => {
    document.title = title ? `${title} | ${appName}` : `${appName} | tc-vocab`
  }, [title, appName])
}
