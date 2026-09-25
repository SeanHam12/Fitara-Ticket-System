import { describe, expect, it } from 'vitest'
import { calculateColumnMove } from './ticket-ordering'

const rows = [
  { id: 'a', statusId: 'todo' },
  { id: 'b', statusId: 'todo' },
  { id: 'c', statusId: 'doing' },
]
describe('server-authoritative column ordering', () => {
  it('moves to the beginning', () =>
    expect(calculateColumnMove(rows, 'b', 'todo', 'todo', 'a')?.target).toEqual(
      ['b', 'a'],
    ))
  it('moves to the end', () =>
    expect(
      calculateColumnMove(rows, 'a', 'todo', 'todo', null)?.target,
    ).toEqual(['b', 'a']))
  it('moves across columns', () =>
    expect(calculateColumnMove(rows, 'a', 'todo', 'doing', 'c')).toEqual({
      source: ['b'],
      target: ['a', 'c'],
    }))
  it('moves into an empty column', () =>
    expect(
      calculateColumnMove(rows, 'a', 'todo', 'done', null)?.target,
    ).toEqual(['a']))
  it('rejects a neighbor outside the target column', () =>
    expect(calculateColumnMove(rows, 'a', 'todo', 'doing', 'b')).toBeNull())
})
