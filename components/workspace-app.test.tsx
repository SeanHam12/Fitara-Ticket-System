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
  assigneeMembershipId: id(3),
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
    expect(
      screen.getByRole('heading', { name: 'Done when' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/completion tracking is not implemented/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Work & blockers' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Discussion & activity' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Resources' }),
    ).toBeInTheDocument()
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

  it('preserves the draft while adding a real assignee and selects the new person', async () => {
    let created = false
    let ticketBody: Record<string, unknown> | undefined
    const newPerson = { id: id(2), name: 'Taylor Kim', username: 'taylor' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/v1/memberships' && init?.method === 'POST') {
          created = true
          return { ok: true, json: async () => ({ data: newPerson }) }
        }
        if (url === '/api/v1/tickets' && init?.method === 'POST') {
          ticketBody = JSON.parse(String(init.body))
          return {
            ok: true,
            json: async () => ({
              data: {
                ...ticket,
                title: ticketBody?.title,
                assigneeMembershipId: id(2),
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
                  members: created
                    ? [...boot.members, newPerson]
                    : boot.members,
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
    const add = within(drawer).getByRole('button', {
      name: 'Add user beside Assignee',
    })
    await userEvent.click(add)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(within(drawer).getByLabelText('Title')).toHaveValue(
      'Keep this draft',
    )
    await userEvent.click(add)
    const form = screen.getByRole('dialog', { name: 'Add user for assignee' })
    await userEvent.type(within(form).getByLabelText('Username'), 'taylor')
    await userEvent.type(within(form).getByLabelText('Name'), 'Taylor Kim')
    await userEvent.type(within(form).getByLabelText('Function'), 'Design')
    await userEvent.click(
      within(form).getByRole('button', { name: 'Create user' }),
    )
    await waitFor(() =>
      expect(within(drawer).getByLabelText('Assignee')).toHaveValue(id(2)),
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
    await waitFor(() => expect(ticketBody?.assigneeMembershipId).toBe(id(2)))
    expect(ticketBody?.title).toBe('Keep this draft')
  }, 15_000)

  it('hides user creation and deletion from a member', async () => {
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
      screen.queryByRole('button', { name: 'Add user beside Assignee' }),
    ).toBeNull()
  })
})
