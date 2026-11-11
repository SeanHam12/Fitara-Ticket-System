import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceApp } from './workspace-app'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
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
    { id: id(5), name: 'Triage' },
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
afterEach(() => vi.unstubAllGlobals())
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
      screen.getByRole('link', { name: 'Delete tickets' }),
    ).toHaveAttribute('href', '/settings/tickets')
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
