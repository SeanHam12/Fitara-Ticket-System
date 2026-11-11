import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TicketSelectionTable } from './ticket-trash-manager'

const tickets = [
  {
    id: '1',
    identifier: 'FIT-1',
    title: 'First',
    type: 'task',
    priority: 'p2',
    projectId: 'p',
  },
  {
    id: '2',
    identifier: 'FIT-2',
    title: 'Second',
    type: 'bug',
    priority: 'p1',
    projectId: 'p',
  },
]

describe('ticket trash selection', () => {
  it('selects one or all ticket rows', async () => {
    const setSelected = vi.fn()
    const { rerender } = render(
      <TicketSelectionTable
        title="Active tickets"
        tickets={tickets}
        selected={[]}
        setSelected={setSelected}
        projects={[{ id: 'p', name: 'Fitara' }]}
      />,
    )
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select FIT-1' }),
    )
    expect(setSelected).toHaveBeenLastCalledWith(['1'])
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all active tickets' }),
    )
    expect(setSelected).toHaveBeenLastCalledWith(['1', '2'])
    rerender(
      <TicketSelectionTable
        title="Active tickets"
        tickets={tickets}
        selected={['1', '2']}
        setSelected={setSelected}
        projects={[]}
      />,
    )
    expect(
      screen.getByRole('checkbox', { name: 'Select all active tickets' }),
    ).toBeChecked()
  })
})
