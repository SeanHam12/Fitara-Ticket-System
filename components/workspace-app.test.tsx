import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceApp } from './workspace-app'
const router = { push: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/auth-client', () => ({ authClient: { signOut: vi.fn() } }))
const id = (n: number) => `${n}0000000-0000-4000-8000-000000000001`
const boot = {
  actor: {
    name: 'Alex Morgan',
    membershipId: id(3),
    role: 'owner',
    passwordChangeRequired: false,
  },
  workspace: { id: id(1), name: 'Fitara Demo' },
  projects: [{ id: id(4), name: 'Fitara Work' }],
  statuses: [
    { id: id(5), key: 'triage', name: 'Triage' },
    { id: id(6), name: 'In Progress' },
    { id: id(7), name: 'Review' },
    { id: id(8), name: 'Done' },
  ],
  labels: [],
  members: [{ id: id(3), name: 'Alex Morgan' }],
}
const ticket = {
  id: id(9),
  identifier: 'FIT-1',
  title: 'Build the demo',
  description: 'A real ticket',
  type: 'task',
  priority: 'p2',
  statusId: id(5),
  projectId: id(4),
  reporterMembershipId: id(3),
  assigneeMembershipIds: [id(3)],
  githubUrl: null,
  position: 1000,
  blocked: false,
  dueDate: null,
  version: 1,
  labels: [],
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
describe('workspace interaction', () => {
  it('validates and saves a GitHub link while editing a ticket', async () => {
    let patched: Record<string, unknown> | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          patched = JSON.parse(String(init.body))
          return {
            ok: true,
            json: async () => ({
              data: { ...ticket, githubUrl: patched?.githubUrl, activity: [] },
            }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            data: url.includes('bootstrap')
              ? boot
              : url.endsWith(id(9))
                ? { ...ticket, activity: [] }
                : [ticket],
          }),
        }
      }),
    )
    render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    fireEvent.click(
      screen.getByRole('button', { name: /FIT-1: Build the demo/ }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit ticket' }),
    )
    await userEvent.type(
      screen.getByLabelText('GitHub link'),
      'https://evil.test/a/b',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('valid GitHub')
    expect(patched).toBeUndefined()
    await userEvent.clear(screen.getByLabelText('GitHub link'))
    await userEvent.type(
      screen.getByLabelText('GitHub link'),
      'https://github.com/fitara/work/issues/7',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(patched?.githubUrl).toBe(
        'https://github.com/fitara/work/issues/7',
      ),
    )
    expect(
      await screen.findByRole('link', {
        name: 'https://github.com/fitara/work/issues/7',
      }),
    ).toHaveAttribute('rel', 'noopener noreferrer')
  }, 15_000)
  it('saves several assignees and reloads them after refresh', async () => {
    const second = { id: id(2), name: 'Taylor Kim' }
    let saved = { ...ticket, assigneeMembershipIds: [id(3)] }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          const body = JSON.parse(String(init.body)) as {
            assigneeMembershipIds: string[]
          }
          saved = {
            ...saved,
            assigneeMembershipIds: body.assigneeMembershipIds,
          }
        }
        return {
          ok: true,
          json: async () => ({
            data: url.includes('bootstrap')
              ? { ...boot, members: [...boot.members, second] }
              : url.endsWith(id(9)) || init?.method === 'PATCH'
                ? { ...saved, activity: [] }
                : [saved],
          }),
        }
      }),
    )
    const view = render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    fireEvent.click(
      screen.getByRole('button', { name: /FIT-1: Build the demo/ }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit ticket' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Add another assignee' }),
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Choose existing assignee'),
      id(2),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(saved.assigneeMembershipIds).toEqual([id(3), id(2)]),
    )
    view.unmount()
    render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    fireEvent.click(
      screen.getByRole('button', { name: /FIT-1: Build the demo/ }),
    )
    expect(
      await screen.findByText('Alex Morgan, Taylor Kim'),
    ).toBeInTheDocument()
  }, 15_000)
  it('counts and filters a ticket for every assignee', async () => {
    const second = { id: id(2), name: 'Taylor Kim' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          data: url.includes('bootstrap')
            ? { ...boot, members: [...boot.members, second] }
            : [{ ...ticket, assigneeMembershipIds: [id(3), id(2)] }],
        }),
      })),
    )
    render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Assignee' }),
      id(2),
    )
    expect(
      screen.getByRole('button', { name: /FIT-1: Build the demo/ }),
    ).toBeInTheDocument()
    expect(screen.getByTitle('Alex Morgan, Taylor Kim')).toBeInTheDocument()
  })
  it('switches board/list and opens a ticket drawer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          data: url.includes('bootstrap')
            ? boot
            : url.endsWith(id(9))
              ? { ...ticket, activity: [] }
              : [ticket],
        }),
      })),
    )
    render(<WorkspaceApp />)
    expect(await screen.findByText('Your work, in focus.')).toBeInTheDocument()
    for (const filter of [
      'Status',
      'Project',
      'Assignee',
      'Reporter',
      'Blocked',
    ])
      expect(screen.getByRole('combobox', { name: filter })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Priority' })).toBeNull()
    expect(
      screen.getByRole('link', { name: /workspace configuration/i }),
    ).toHaveAttribute('href', '/settings/workspace')
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/settings/members',
    )
    expect(
      screen.getByRole('button', { name: 'Delete tickets' }),
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole('button', { name: 'Delete tickets' })
        .compareDocumentPosition(
          screen.getByRole('button', { name: /New ticket/ }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete tickets' }),
    )
    expect(router.push).toHaveBeenCalledWith('/settings/tickets')
    expect(
      screen.getByRole('button', { name: /To Do Inbox/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Triage Inbox')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View 1 open tickets' }),
    ).toHaveAttribute('href', '/tickets/open')
    expect(
      screen.getByRole('link', { name: 'View 1 assigned to you' }),
    ).toHaveAttribute('href', '/tickets/assigned')
    expect(
      screen.getByRole('link', { name: 'View 0 needs review' }),
    ).toHaveAttribute('href', '/tickets/review')
    expect(
      screen.getByRole('link', { name: 'View 0 blocked' }),
    ).toHaveAttribute('href', '/tickets/blocked')
    expect(
      screen.getByRole('button', {
        name: 'FIT-1: Build the demo. Open or drag to move.',
      }),
    ).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }))
    expect(screen.getByLabelText('Primary color')).toBeInTheDocument()
    expect(screen.getByLabelText('Secondary color')).toBeInTheDocument()
    expect(screen.getByLabelText('Background color')).toBeInTheDocument()
    expect(screen.getByLabelText('Move FIT-1')).toBeEnabled()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'FIT-1: Build the demo. Open or drag to move.',
      }),
    )
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(
      screen.getByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Done when' })).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Work & blockers' }),
    ).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Discussion & activity' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resources' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /close drawer/i }))
    await userEvent.click(screen.getByRole('button', { name: /list/i }))
    expect(
      screen.getByRole('columnheader', { name: 'Ticket' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByText('Build the demo'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /close drawer/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }, 10_000)
})

describe('ticket creation from overview', () => {
  it('reloads created tickets from the server and keeps a failed save in the form', async () => {
    const saved = [ticket]
    let failNext = true
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/tickets' && init?.method === 'POST') {
          if (failNext) {
            failNext = false
            return {
              ok: false,
              status: 503,
              json: async () => ({ detail: 'Database unavailable' }),
            }
          }
          const body = JSON.parse(String(init.body))
          const created = {
            ...ticket,
            id: id(2),
            identifier: 'FIT-2',
            title: body.title,
          }
          saved.push(created)
          return {
            ok: true,
            status: 201,
            json: async () => ({ data: created }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            data: url.includes('bootstrap') ? boot : [...saved],
          }),
        }
      }),
    )
    const first = render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    await userEvent.click(screen.getByRole('button', { name: /New ticket/ }))
    await userEvent.type(screen.getByLabelText('Title'), 'Persistent ticket')
    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database unavailable',
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Persistent ticket')
    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
    await screen.findByRole('button', { name: /FIT-2: Persistent ticket/ })
    first.unmount()
    render(<WorkspaceApp />)
    expect(
      await screen.findByRole('button', { name: /FIT-2: Persistent ticket/ }),
    ).toBeInTheDocument()
  }, 15_000)

  it('adds existing assignees without creating a user and saves them', async () => {
    let ticketBody: Record<string, unknown> | undefined
    const second = { id: id(2), name: 'Taylor Kim' }
    const third = { id: id(10), name: 'Morgan Lee' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/memberships' && init?.method === 'POST') {
          throw new Error('Assignee selection must not create users')
        }
        if (url === '/api/v1/tickets' && init?.method === 'POST') {
          ticketBody = JSON.parse(String(init.body))
          return {
            ok: true,
            json: async () => ({
              data: {
                ...ticket,
                title: ticketBody?.title,
                assigneeMembershipIds: [id(2), id(3)],
                githubUrl: ticketBody?.githubUrl,
              },
            }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            data: url.includes('bootstrap')
              ? {
                  ...boot,
                  actor: { ...boot.actor, localDemoUserCreation: true },
                  members: [...boot.members, second, third],
                }
              : [ticket],
          }),
        }
      }),
    )
    render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    await userEvent.click(screen.getByRole('button', { name: /New ticket/ }))
    const drawer = screen.getByRole('dialog', { name: 'Create ticket' })
    await userEvent.type(
      within(drawer).getByLabelText('Title'),
      'Keep this draft',
    )
    await userEvent.selectOptions(
      within(drawer).getByLabelText('Assignee 1'),
      id(3),
    )
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add another assignee' }),
    )
    expect(
      within(drawer).getByLabelText('Choose existing assignee'),
    ).not.toHaveTextContent('Alex Morgan')
    await userEvent.selectOptions(
      within(drawer).getByLabelText('Choose existing assignee'),
      id(2),
    )
    expect(within(drawer).getByLabelText('Assignee 2')).toHaveValue(id(2))
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add another assignee' }),
    )
    await userEvent.selectOptions(
      within(drawer).getByLabelText('Choose existing assignee'),
      id(10),
    )
    expect(within(drawer).getByLabelText('Assignee 3')).toHaveValue(id(10))
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Morgan Lee' }),
    )
    expect(within(drawer).queryByLabelText('Assignee 3')).toBeNull()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Remove Alex Morgan' }),
    )
    expect(within(drawer).getByLabelText('Assignee 1')).toHaveValue(id(2))
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add another assignee' }),
    )
    await userEvent.selectOptions(
      within(drawer).getByLabelText('Choose existing assignee'),
      id(3),
    )
    await userEvent.type(
      within(drawer).getByLabelText('GitHub link'),
      'https://github.com/fitara/work/pull/42',
    )
    expect(within(drawer).getByLabelText('Title')).toHaveValue(
      'Keep this draft',
    )
    expect(within(drawer).getByLabelText('Status')).toHaveValue(id(5))
    expect(within(drawer).getByLabelText('Status')).toHaveTextContent('To Do')
    expect(within(drawer).getByLabelText('Priority')).toHaveValue('p3')
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Create ticket' }),
    )
    await waitFor(() =>
      expect(ticketBody?.assigneeMembershipIds).toEqual([id(2), id(3)]),
    )
    expect(ticketBody?.githubUrl).toBe('https://github.com/fitara/work/pull/42')
    const link = await screen.findByRole('link', {
      name: 'https://github.com/fitara/work/pull/42',
    })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(ticketBody?.title).toBe('Keep this draft')
  }, 15_000)

  it('keeps deletion restricted for a member while allowing existing assignees', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          data: url.includes('bootstrap')
            ? {
                ...boot,
                actor: {
                  ...boot.actor,
                  role: 'member',
                  localDemoUserCreation: true,
                },
              }
            : [ticket],
        }),
      })),
    )
    render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    expect(screen.queryByRole('button', { name: 'Delete tickets' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /New ticket/ }))
    expect(
      screen.getByRole('button', { name: 'Add another assignee' }),
    ).toBeInTheDocument()
  })

  it('can remove every assignee and submit an unassigned ticket', async () => {
    let body: Record<string, unknown> | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/tickets' && init?.method === 'POST') {
          body = JSON.parse(String(init.body))
          return {
            ok: true,
            json: async () => ({
              data: { ...ticket, assigneeMembershipIds: [] },
            }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            data: url.includes('bootstrap') ? boot : [ticket],
          }),
        }
      }),
    )
    render(<WorkspaceApp />)
    await screen.findByText('Your work, in focus.')
    await userEvent.click(screen.getByRole('button', { name: /New ticket/ }))
    await userEvent.type(screen.getByLabelText('Title'), 'Unassigned work')
    await userEvent.selectOptions(screen.getByLabelText('Assignee 1'), id(3))
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Alex Morgan' }),
    )
    expect(screen.getByLabelText('Assignee 1')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
    await waitFor(() => expect(body?.assigneeMembershipIds).toEqual([]))
  })
})
