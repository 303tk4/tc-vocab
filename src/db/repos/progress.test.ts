import { describe, expect, it } from 'vitest'
import { createProgressStore } from './progress'

describe('ProgressStore', () => {
  it('モードごとに進捗が分かれる', async () => {
    const a = createProgressStore('mode-a')
    const b = createProgressStore('mode-b')
    await a.put('w1', 100, { reps: 1 })

    expect((await a.get('w1'))?.state).toEqual({ reps: 1 })
    expect(await b.get('w1')).toBeUndefined()
  })

  it('getMany は存在する進捗だけを返す', async () => {
    const store = createProgressStore('m')
    await store.put('w1', 1, 'x')
    const map = await store.getMany(['w1', 'w2'])
    expect([...map.keys()]).toEqual(['w1'])
  })

  it('dueBefore は期限切れのものを古い順に返し、期限なしは含めない', async () => {
    const store = createProgressStore('m')
    await store.put('late', 300, null)
    await store.put('early', 100, null)
    await store.put('future', 900, null)
    await store.put('none', null, null)
    await createProgressStore('other').put('other', 50, null)

    const due = await store.dueBefore(500)
    expect(due.map((p) => p.wordId)).toEqual(['early', 'late'])
  })
})
