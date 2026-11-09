import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router'
import { BookIcon, GearIcon } from '../components/icons'
import styles from './Layout.module.css'
import { UpdatePrompt } from './UpdatePrompt'

export function Layout() {
  const { t } = useTranslation()
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* 読み上げる名前は見えている文字から始める（WCAG 2.5.3、NFR-04） */}
          <Link to="/" className={styles.brand}>
            <span className={styles.logo} lang="zh-TW">
              {t('app.name')}
            </span>
            <span className={styles.tagline}>{t('app.tagline')}</span>
            <span className="visually-hidden">{t('nav.brandHomeSuffix')}</span>
          </Link>
          <nav className={styles.nav}>
            <NavLink to="/words" className={navClass}>
              <BookIcon />
              <span className={styles.navLabel}>{t('nav.words')}</span>
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              <GearIcon />
              <span className={styles.navLabel}>{t('nav.settings')}</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <UpdatePrompt />
    </div>
  )
}
