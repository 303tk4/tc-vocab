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
          <Link to="/" className={styles.brand} aria-label={t('nav.home')}>
            <span className={styles.logo} lang="zh-TW">
              {t('app.name')}
            </span>
            <span className={styles.tagline}>{t('app.tagline')}</span>
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
