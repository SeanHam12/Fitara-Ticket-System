import { describe, expect, it } from 'vitest'
import {
  createTicketSchema,
  moveTicketSchema,
  updateTicketSchema,
} from './schemas'
const id = '10000000-0000-4000-8000-000000000001'
describe('ticket request validation', () => {
  it('accepts a complete creation command', () => {
    expect(
      createTicketSchema.parse({
        projectId: id,
        title: 'Ship demo',
        description: 'Ready',
        type: 'task',
        priority: 'p2',
        statusId: id,
        assigneeMembershipId: null,
        labelIds: [],
        dueDate: null,
      }).title,
    ).toBe('Ship demo')
  })
  it('rejects unsafe or incomplete values', () => {
    expect(() =>
      createTicketSchema.parse({
        projectId: id,
        title: '',
        type: 'other',
        priority: 'urgent',
        statusId: id,
      }),
    ).toThrow()
  })
  it('requires versions for edits and moves', () => {
    expect(() => updateTicketSchema.parse({ title: 'Changed' })).toThrow()
    expect(() =>
      moveTicketSchema.parse({ expectedVersion: 0, statusId: id }),
    ).toThrow()
  })
})
