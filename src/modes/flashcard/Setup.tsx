import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '../../components/SegmentedControl'
import type { SetupProps } from '../types'
import { DIRECTIONS, type FlashcardOptions } from './options'

export default function FlashcardSetup({ options, onChange }: SetupProps<FlashcardOptions>) {
  const { t } = useTranslation('mode.flashcard')
  return (
    <SegmentedControl
      label={t('direction')}
      value={options.direction}
      options={DIRECTIONS.map((d) => ({ value: d, label: t(`directions.${d}`) }))}
      onChange={(direction) => onChange({ ...options, direction })}
    />
  )
}
