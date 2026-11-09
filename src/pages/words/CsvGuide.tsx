// CSV の列の案内（仕様書 9.3 FR-IO-09）
import { useTranslation } from 'react-i18next'
import { buildCsvTemplate, CSV_COLUMNS, REQUIRED_COLUMNS } from '../../io/csv'
import { downloadText } from '../../io/download'
import styles from './WordsPage.module.css'

/** 例が中国語の列 */
const ZH_EXAMPLES: readonly string[] = ['hanzi', 'zhuyin', 'pinyin', 'example', 'tags']

/** 表計算ソフトで作る列の一覧と注意点。見本の CSV もダウンロードできる */
export function CsvGuide() {
  const { t } = useTranslation()
  const required: readonly string[] = REQUIRED_COLUMNS
  return (
    <details className={styles.guide} open>
      <summary>{t('io.guide.title')}</summary>
      <p>{t('io.guide.intro')}</p>
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
        <li>{t('io.guide.notes.header')}</li>
        <li>{t('io.guide.notes.encoding')}</li>
        <li>{t('io.guide.notes.duplicate')}</li>
        <li>{t('io.guide.notes.json')}</li>
      </ul>
      <button
        type="button"
        className="button button--block-sm"
        onClick={() => downloadText('tc-vocab-template.csv', buildCsvTemplate(), 'text/csv')}
      >
        {t('io.guide.template')}
      </button>
    </details>
  )
}
