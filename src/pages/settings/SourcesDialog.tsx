// 出典とライセンスのダイアログ（仕様書 10.3、FR-SET-08）
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../../components/Dialog'
import { ExternalLinkIcon } from '../../components/icons'
import { loadLicenses, SOURCES, type ThirdPartyLicense } from '../../services/licenses'
import styles from './SourcesDialog.module.css'

interface Props {
  open: boolean
  onClose(): void
}

export function SourcesDialog({ open, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      title={t('about.sourcesTitle')}
      onClose={onClose}
      actions={
        <button type="button" className="button" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <Body />
    </Dialog>
  )
}

/** 新しいタブで開く外部のリンク（FR-SET-05 と同じ示し方） */
function ExternalLink({
  href,
  lang,
  children,
}: {
  href: string
  lang?: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
      <span lang={lang}>{children}</span>
      <span className="visually-hidden">{t('settings.newTab')}</span>
      <ExternalLinkIcon />
    </a>
  )
}

function Body() {
  const { t } = useTranslation()
  const { vocab, zhuyin, meanings } = SOURCES
  return (
    <div className={styles.body}>
      <section className={styles.section}>
        <h3 className="section-title">{t('about.packsTitle')}</h3>
        <dl className={styles.sources}>
          <dt>{t('about.sourceVocab')}</dt>
          <dd>
            <ExternalLink href={vocab.url} lang="zh-TW">
              {vocab.name}
            </ExternalLink>
          </dd>
          <dt>{t('about.sourceZhuyin')}</dt>
          <dd>
            <ExternalLink href={zhuyin.url} lang="zh-TW">
              {zhuyin.name}
            </ExternalLink>
            <br />
            {t('about.license')}
            <ExternalLink href={zhuyin.licenseUrl} lang="zh-TW">
              {zhuyin.license}
            </ExternalLink>
          </dd>
          <dt>{t('about.sourceMeanings')}</dt>
          <dd>
            {t('about.sourceMeaningsBody')}
            <br />
            {t('about.license')}
            <ExternalLink href={meanings.licenseUrl}>{meanings.license}</ExternalLink>
          </dd>
        </dl>
      </section>
      <section className={styles.section}>
        <h3 className="section-title">{t('about.librariesTitle')}</h3>
        <p className="muted">{t('about.librariesNote')}</p>
        <Libraries />
      </section>
    </div>
  )
}

type LoadState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ok'; list: ThirdPartyLicense[] }

function Libraries() {
  const { t } = useTranslation()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    loadLicenses().then(
      (list) => active && setState({ kind: 'ok', list }),
      () => active && setState({ kind: 'error' }),
    )
    return () => {
      active = false
    }
  }, [])

  if (state.kind === 'loading') return <p className="muted">{t('common.loading')}</p>
  if (state.kind === 'error') return <p role="alert">{t('about.librariesError')}</p>
  return (
    <ul className={styles.libraries}>
      {state.list.map((p) => (
        <li key={p.name}>
          <details>
            <summary>
              <span className={styles.libName}>{p.name}</span>{' '}
              <span className="muted">
                {p.version}（{p.license}）
              </span>
            </summary>
            {/* スクロールする全文は、キーボードでも動かせるようにする（NFR-03） */}
            {p.text && (
              <pre className={styles.licenseText} tabIndex={0}>
                {p.text}
              </pre>
            )}
          </details>
        </li>
      ))}
    </ul>
  )
}
