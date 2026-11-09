// CSV の作り方の案内（仕様書 9.3 FR-IO-09）
import { useTranslation } from 'react-i18next'
import {
  buildCsvHeaderTemplate,
  buildCsvTemplate,
  CSV_COLUMNS,
  REQUIRED_COLUMNS,
} from '../../io/csv'
import { downloadText } from '../../io/download'
import styles from './WordsPage.module.css'

/** 例が中国語の列 */
const ZH_EXAMPLES: readonly string[] = ['hanzi', 'zhuyin', 'pinyin', 'example', 'tags']

/** 保存方法を案内するアプリ（表示順） */
const SAVE_APPS = ['excelWindows', 'excelMac', 'googleSheets', 'numbers'] as const

interface Props {
  /** 保存方法の案内を開いておく（文字コードの誤りなどで読めなかったとき） */
  saveGuideOpen?: boolean
}

/** 表計算ソフトで作る列の一覧、テンプレート、UTF-8 の CSV での保存方法 */
export function CsvGuide({ saveGuideOpen = false }: Props) {
  const { t } = useTranslation()
  const required: readonly string[] = REQUIRED_COLUMNS
  const steps = (app: (typeof SAVE_APPS)[number]) =>
    t(`io.guide.save.${app}.steps`, { returnObjects: true }) as string[]

  return (
    <>
      <details className={styles.guide} open>
        <summary>{t('io.guide.title')}</summary>
        <p>{t('io.guide.intro')}</p>
        <p className={styles.warning}>{t('io.guide.headerWarning')}</p>
        <div className={styles.guideTableWrap}>
          <table className={styles.guideTable}>
            <thead>
              <tr>
                <th scope="col">{t('io.guide.column')}</th>
                <th scope="col">{t('io.guide.content')}</th>
              </tr>
            </thead>
            <tbody>
              {CSV_COLUMNS.map((column) => (
                <tr key={column}>
                  <th scope="row">
                    <code>{column}</code>
                    {required.includes(column) && (
                      <span className={styles.requiredBadge}>{t('io.guide.required')}</span>
                    )}
                  </th>
                  <td>
                    {t(`io.guide.columns.${column}`)}
                    <span className={styles.guideExample}>
                      {t('io.guide.example')}
                      <span lang={ZH_EXAMPLES.includes(column) ? 'zh-TW' : undefined}>
                        {t(`io.guide.examples.${column}`)}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.guideNotes}>
          <li>{t('io.guide.notes.encoding')}</li>
          <li>{t('io.guide.notes.duplicate')}</li>
          <li>{t('io.guide.notes.json')}</li>
        </ul>
        <div className={styles.templateButtons}>
          <button
            type="button"
            className="button"
            onClick={() =>
              downloadText('tc-vocab-template.csv', buildCsvHeaderTemplate(), 'text/csv')
            }
          >
            {t('io.guide.headerTemplate')}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => downloadText('tc-vocab-sample.csv', buildCsvTemplate(), 'text/csv')}
          >
            {t('io.guide.sampleTemplate')}
          </button>
        </div>
        <p className="muted">{t('io.guide.templateHint')}</p>
      </details>

      {/* 開いた状態を切り替えるため、key で作り直す */}
      <details key={String(saveGuideOpen)} className={styles.guide} open={saveGuideOpen}>
        <summary>{t('io.guide.save.title')}</summary>
        <p className={styles.warning}>{t('io.guide.save.lead')}</p>
        {SAVE_APPS.map((app) => (
          <section key={app} className={styles.saveApp}>
            <h3 className={styles.saveAppTitle}>{t(`io.guide.save.${app}.title`)}</h3>
            <ol className={styles.guideNotes}>
              {steps(app).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        ))}
        <ul className={styles.guideNotes}>
          <li>{t('io.guide.save.oldExcel')}</li>
          <li>{t('io.guide.save.sheets')}</li>
        </ul>
      </details>
    </>
  )
}
