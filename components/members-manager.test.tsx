import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MembersManager, normalizeMembers } from './members-manager'

afterEach(() => vi.unstubAllGlobals())

describe('users management', () => {
  it('ignores null rows and a null response instead of reading name from null', () => {
    expect(normalizeMembers([null, { id: '1', name: 'Alex' }])).toEqual([
      { id: '1', name: 'Alex' },
    ])
    expect(normalizeMembers(null)).toEqual([])
  })

  it('creates a three-field demo person and refreshes the compact list', async () => {
    const rows: object[] = []
    const requests: object[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/memberships' && init?.method === 'POST') {
          const body = JSON.parse(String(init.body))
          requests.push(body)
          rows.push({
            id: 'member-1',
            name: body.name,
            username: body.username,
            jobTitle: body.function,
            jobFunctionId: null,
            role: 'member',
            state: 'active',
          })
          return { ok: true, json: async () => ({ data: rows[0] }) }
        }
        const data = url.includes('memberships')
          ? [...rows]
          : url.includes('bootstrap')
            ? { actor: { role: 'owner', localDemoUserCreation: true } }
            : { taxonomy: [] }
        return { ok: true, json: async () => ({ data }) }
      }),
    )
    render(<MembersManager />)
    await userEvent.type(await screen.findByLabelText('Username'), 'taylor')
    await userEvent.type(screen.getByLabelText('Name'), 'Taylor Kim')
    await userEvent.type(screen.getByLabelText('Function'), 'Design')
    expect(screen.queryByLabelText('Job title')).toBeNull()
    expect(screen.queryByLabelText('Authorization role')).toBeNull()
    expect(screen.queryByLabelText('Internal email')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Taylor Kim')).toBeInTheDocument()
    expect(screen.getByText('@taylor')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(requests).toEqual([
      { username: 'taylor', name: 'Taylor Kim', function: 'Design' },
    ])
    expect(screen.queryByText('No sign-in username')).toBeNull()
  })

  it('refreshes the row after editing details in the actions menu', async () => {
    let name = 'Alex Morgan'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH') name = JSON.parse(String(init.body)).name
        const data = url.includes('memberships')
          ? [
              {
                id: 'member-1',
                name,
                username: null,
                jobTitle: 'Engineering',
                jobFunctionId: null,
                role: 'member',
                state: 'active',
              },
            ]
          : url.includes('bootstrap')
            ? { actor: { role: 'owner', localDemoUserCreation: true } }
            : { taxonomy: [] }
        return { ok: true, json: async () => ({ data }) }
      }),
    )
    render(<MembersManager />)
    await screen.findByText('Alex Morgan')
    expect(
      screen.getByText('Username not set').closest('details'),
    ).not.toHaveAttribute('open')
    await userEvent.click(screen.getByLabelText('Actions for Alex Morgan'))
    const menu = screen
      .getByLabelText('Actions for Alex Morgan')
      .closest('details')!
    expect(within(menu).getByText('Username not set')).toBeInTheDocument()
    await userEvent.clear(within(menu).getByLabelText('Name'))
    await userEvent.type(within(menu).getByLabelText('Name'), 'Alex Reed')
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Save details' }),
    )
    await waitFor(() =>
      expect(screen.getByText('Alex Reed')).toBeInTheDocument(),
    )
  })
})
