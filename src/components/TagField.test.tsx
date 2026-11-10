import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../i18n'
import { TagField } from './TagField'

describe('TagField', () => {
  it('タグの付け方の例を、入力欄の補足として示す（FR-WORDS-19）', () => {
    render(<TagField label="Tag" value="" onChange={() => {}} suggestions={[]} />)
    expect(screen.getByRole('combobox', { name: 'Tag' })).toHaveAccessibleDescription(
      'e.g. transport, food, verbs, review — any labels that help you sort words',
    )
  })

  it('エラーがあれば、エラーと例の両方を補足にする', () => {
    render(
      <TagField label="Tag" value="a;b" onChange={() => {}} suggestions={[]} error="invalidChar" />,
    )
    const description = screen
      .getByRole('combobox', { name: 'Tag' })
      .getAttribute('aria-describedby')
    expect(description?.split(' ')).toHaveLength(2)
  })
})
