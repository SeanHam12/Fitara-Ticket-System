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

  it('confirms deletion with the active assignment count, hides the user, and allows restore', async () => {
    let state: 'active' | 'removed' = 'active'
    let deletes = 0
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/memberships/person-1') {
          if (init?.method === 'DELETE') {
            expect(JSON.parse(String(init.body))).toEqual({
              expectedActiveTicketCount: 2,
            })
            deletes += 1
            state = 'removed'
            return { ok: true, json: async () => ({ data: { removed: true } }) }
          }
          if (init?.method === 'PATCH') {
            state = 'active'
            return { ok: true, json: async () => ({ data: {} }) }
          }
          return {
            ok: true,
            json: async () => ({
              data: {
                name: 'Taylor Kim',
                username: 'taylor',
                activeTicketCount: 2,
              },
            }),
          }
        }
        const data =
          url === '/api/v1/memberships'
            ? [
                {
                  id: 'actor-1',
                  name: 'Alex Morgan',
                  username: 'alex',
                  jobTitle: 'Manager',
                  jobFunctionId: null,
                  role: 'owner',
                  state: 'active',
                },
                {
                  id: 'person-1',
                  name: 'Taylor Kim',
                  username: 'taylor',
                  jobTitle: 'Design',
                  jobFunctionId: null,
                  role: 'member',
                  state,
                },
              ]
            : url.includes('bootstrap')
              ? {
                  actor: {
                    role: 'owner',
                    membershipId: 'actor-1',
                    localDemoUserCreation: true,
                  },
                }
              : { taxonomy: [] }
        return { ok: true, json: async () => ({ data }) }
      }),
    )
    render(<MembersManager />)
    await screen.findByText('Taylor Kim')
    expect(screen.queryByLabelText('Actions for Alex Morgan')).toBeNull()
    await userEvent.click(screen.getByLabelText('Actions for Taylor Kim'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete user' })
    expect(within(dialog).getByText(/Taylor Kim/)).toBeInTheDocument()
    expect(within(dialog).getByText(/@taylor/)).toBeInTheDocument()
    expect(within(dialog).getByText(/2 active tickets/)).toBeInTheDocument()
    expect(deletes).toBe(0)
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(deletes).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete user',
      }),
    )
    await waitFor(() => expect(deletes).toBe(1))
    expect(screen.queryByLabelText('Actions for Taylor Kim')).toBeNull()
    await userEvent.click(screen.getByText('Deleted users (1)'))
    await userEvent.click(screen.getByRole('button', { name: 'Restore user' }))
    expect(
      await screen.findByLabelText('Actions for Taylor Kim'),
    ).toBeInTheDocument()
  })
})
