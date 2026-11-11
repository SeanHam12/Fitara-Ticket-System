import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MembersManager, normalizeMembers } from './members-manager'

afterEach(() => vi.unstubAllGlobals())

describe('users data normalization', () => {
  it('ignores null records instead of reading name from null', () => {
    expect(normalizeMembers([null, { id: '1', name: 'Alex' }])).toEqual([
      { id: '1', name: 'Alex' },
    ])
  })
  it('handles a null response as an empty list', () => {
    expect(normalizeMembers(null)).toEqual([])
  })

  it('creates a user and shows it after the refreshed membership request', async () => {
    let created = false
    const member = {
      id: 'member-1',
      name: 'Taylor Kim',
      username: 'taylor',
      email: 'private@example.test',
      role: 'member',
      jobTitle: 'Designer',
      teamRoleId: null,
      jobCategoryId: null,
      jobFunctionId: null,
      state: 'active',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/memberships' && init?.method === 'POST')
          created = true
        const data = url.includes('memberships')
          ? created
            ? [member]
            : []
          : url.includes('bootstrap')
            ? { actor: { role: 'owner' } }
            : { taxonomy: [] }
        return { ok: true, json: async () => ({ data }) }
      }),
    )
    render(<MembersManager />)
    await userEvent.type(await screen.findByLabelText('Username'), 'taylor')
    await userEvent.type(screen.getByLabelText('Display name'), 'Taylor Kim')
    await userEvent.click(
      screen.getByText('Credential setup required by current authentication'),
    )
    await userEvent.type(
      screen.getByLabelText('Internal email'),
      'private@example.test',
    )
    await userEvent.type(
      screen.getByLabelText('Temporary password'),
      'temporary-pass-123',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Taylor Kim')).toBeInTheDocument()
    expect(screen.getByText('@taylor')).toBeInTheDocument()
    expect(
      screen.getAllByLabelText(/Authorization role/)[0],
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Team role/)).toBeInTheDocument()
    expect(
      screen.getByText('Controls security permissions.'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText('Descriptive; does not grant access.'),
    ).toHaveLength(3)
  }, 10_000)
})
