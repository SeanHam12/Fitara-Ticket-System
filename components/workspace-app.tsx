'use client'
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { authClient } from '@/lib/auth-client'
import {
  DragDropProvider,
  DragOverlay,
  useDroppable,
  useDragOperation,
} from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Ref = {
  id: string
  name: string
  key?: string
  color?: string
  position?: number
  jobTitle?: string
}
type Boot = {
  actor: {
    name: string
    membershipId: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    passwordChangeRequired: boolean
  }
  workspace: Ref
  projects: Ref[]
  statuses: Ref[]
  labels: Ref[]
  members: Ref[]
}
type Filters = {
  q: string
  status: string
  project: string
  assignee: string
  reporter: string
  blocked: string
}
export type Ticket = {
  id: string
  identifier: string
  title: string
  description: string
  type: string
  priority: string
  statusId: string
  projectId: string
  reporterMembershipId: string
  assigneeMembershipId: string | null
  position: number
  blocked: boolean
  acceptanceCriteria: string
  comments: string
  subtasks: string
  dependencies: string
  attachments: string
  githubDevelopment: string
  dueDate: string | null
  version: number
  labels: Ref[]
  activity?: { id: string; action: string; createdAt: string }[]
}
export type TicketScope = 'open' | 'assigned' | 'review' | 'blocked'

const scopeCopy: Record<TicketScope, { label: string; description: string }> = {
  open: {
    label: 'Open tickets',
    description: 'Tickets across active projects that are not done.',
  },
  assigned: {
    label: 'Assigned to you',
    description: 'Tickets currently assigned to your workspace membership.',
  },
  review: {
    label: 'Needs review',
    description: 'Tickets waiting for review and feedback.',
  },
  blocked: {
    label: 'Blocked',
    description: 'Blocked tickets that need attention.',
  },
}
const defaultTheme = {
  primary: '#6957e8',
  secondary: '#101823',
  background: '#f7f8fb',
}
const ticketDetailFields = [
  { key: 'acceptanceCriteria', label: 'Acceptance criteria' },
  { key: 'comments', label: 'Comments' },
  { key: 'subtasks', label: 'Subtasks' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'githubDevelopment', label: 'GitHub development' },
] as const

function matchesScope(t: Ticket, scope: TicketScope, boot: Boot) {
  if (scope === 'open') return t.statusId !== boot.statuses[3]?.id
  if (scope === 'assigned')
    return t.assigneeMembershipId === boot.actor.membershipId
  if (scope === 'review') return t.statusId === boot.statuses[2]?.id
  return t.blocked
}
function memberFor(boot: Boot, membershipId: string | null) {
  return membershipId
    ? boot.members.find((member) => member.id === membershipId)
    : undefined
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init),
    b = await r.json()
  if (!r.ok) throw new ApiError(r.status, b.detail || 'Request failed')
  return b.data
}
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
const I = ({ children }: { children: string }) => (
  <span aria-hidden className="icon">
    {children}
  </span>
)
export function WorkspaceApp({ ticketScope }: { ticketScope?: TicketScope }) {
  const router = useRouter()
  const [boot, setBoot] = useState<Boot>(),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [view, setView] = useState<'board' | 'list'>(
      ticketScope ? 'list' : 'board',
    ),
    [ticket, setTicket] = useState<Ticket>(),
    [create, setCreate] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  const [f, setF] = useState<Filters>({
    q: '',
    status: '',
    project: '',
    assignee: '',
    reporter: '',
    blocked: '',
  })
  const trigger = useRef<HTMLElement | null>(null)
  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [b, t] = await Promise.all([
        api<Boot>('/api/v1/bootstrap'),
        api<Ticket[]>('/api/v1/tickets'),
      ])
      if (b.actor.passwordChangeRequired) {
        router.push('/account')
        return
      }
      setBoot(b)
      setTickets(t)
      setError('')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push('/login?expired=1')
        return
      }
      setError(e instanceof Error ? e.message : 'Unable to load')
    } finally {
      setLoading(false)
    }
  }, [router])
  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])
  const scopedTickets = useMemo(
    () =>
      ticketScope && boot
        ? tickets.filter((t) => matchesScope(t, ticketScope, boot))
        : tickets,
    [tickets, ticketScope, boot],
  )
  const shown = useMemo(
    () =>
      scopedTickets.filter(
        (t) =>
          (!f.q ||
            `${t.identifier} ${t.title} ${t.description}`
              .toLowerCase()
              .includes(f.q.toLowerCase())) &&
          (!f.project || t.projectId === f.project) &&
          (!f.status || t.statusId === f.status) &&
          (!f.assignee || t.assigneeMembershipId === f.assignee) &&
          (!f.reporter || t.reporterMembershipId === f.reporter) &&
          (!f.blocked || String(t.blocked) === f.blocked),
      ),
    [scopedTickets, f],
  )
  const open = async (t: Ticket, e?: React.MouseEvent) => {
    trigger.current = e?.currentTarget as HTMLElement
    try {
      setTicket(await api(`/api/v1/tickets/${t.id}`))
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Unable to open')
    }
  }
  const close = () => {
    setTicket(undefined)
    setCreate(false)
    setTimeout(() => trigger.current?.focus(), 0)
  }
  const mutate = async (id: string, body: object, move = false) => {
    try {
      const updated = await api<Ticket>(
        `/api/v1/tickets/${id}${move ? '/move' : ''}`,
        {
          method: move ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      setTickets((v) => v.map((t) => (t.id === id ? updated : t)))
      setTicket(updated)
      if (move) await load()
      setError('')
    } catch (x) {
      if (x instanceof ApiError && x.status === 401) {
        router.push('/login?expired=1')
        return
      }
      setError(
        x instanceof ApiError && x.status === 403
          ? 'Permission denied. Your role does not permit that change.'
          : x instanceof ApiError && x.status === 409
            ? 'This ticket changed elsewhere. Latest data was restored.'
            : x instanceof Error
              ? `${x.message} Latest data was restored.`
              : 'Change failed',
      )
      await load()
    }
  }
  if (loading)
    return (
      <State title="Opening Fitara Work" body="Loading your demo workspace…" />
    )
  if (!boot) return <State title="Demo unavailable" body={error} retry={load} />
  return (
    <div className="app-shell">
      <Sidebar boot={boot} tickets={tickets} filters={f} setFilters={setF} />
      <main className="workspace-main">
        <header className="topbar">
          <div>
            {ticketScope && (
              <Link className="overview-link" href="/">
                ← Overview
              </Link>
            )}
            <span className="eyebrow">
              MY WORK /{' '}
              {ticketScope ? scopeCopy[ticketScope].label : 'OVERVIEW'}
            </span>
            <h1>
              {ticketScope
                ? scopeCopy[ticketScope].label
                : 'Your work, in focus.'}
            </h1>
            <p>
              {ticketScope
                ? scopeCopy[ticketScope].description
                : 'Track the tickets that need your attention across Fitara.'}
            </p>
          </div>
          <div className="top-actions">
            <span className="demo-badge">
              <i />
              Demo environment
            </span>
            {boot.actor.role !== 'viewer' && (
              <button className="new-button" onClick={() => setCreate(true)}>
                <I>＋</I>New ticket
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        {!ticketScope && <Stats tickets={tickets} boot={boot} />}
        <section className="work-panel">
          <div className="panel-head">
            <div>
              <h2>
                {ticketScope ? scopeCopy[ticketScope].label : 'Assigned work'}
              </h2>
              <p>
                {ticketScope
                  ? `${scopedTickets.length} tickets in this view`
                  : 'Prioritized tickets across active projects'}
              </p>
            </div>
            <div className="segmented">
              <button
                className={view === 'board' ? 'selected' : ''}
                onClick={() => setView('board')}
              >
                <I>▦</I>Board
              </button>
              <button
                className={view === 'list' ? 'selected' : ''}
                onClick={() => setView('list')}
              >
                <I>☷</I>List
              </button>
            </div>
          </div>
          <div className="toolbar">
            <label className="search">
              <I>⌕</I>
              <span className="sr-only">Search</span>
              <input
                placeholder="Search tickets…"
                value={f.q}
                onChange={(e) => setF({ ...f, q: e.target.value })}
              />
            </label>
            <Select
              label="Status"
              value={f.status}
              change={(status) => setF({ ...f, status })}
              items={boot.statuses}
            />
            <Select
              label="Project"
              value={f.project}
              change={(project) => setF({ ...f, project })}
              items={boot.projects}
            />
            <Select
              label="Assignee"
              value={f.assignee}
              change={(assignee) => setF({ ...f, assignee })}
              items={boot.members}
            />
            <Select
              label="Reporter"
              value={f.reporter}
              change={(reporter) => setF({ ...f, reporter })}
              items={boot.members}
            />
            <Select
              label="Blocked"
              value={f.blocked}
              change={(blocked) => setF({ ...f, blocked })}
              items={[
                { id: 'true', name: 'Blocked' },
                { id: 'false', name: 'Not blocked' },
              ]}
            />
            {Object.values(f).some(Boolean) && (
              <button
                className="clear"
                onClick={() =>
                  setF({
                    q: '',
                    status: '',
                    project: '',
                    assignee: '',
                    reporter: '',
                    blocked: '',
                  })
                }
              >
                Clear
              </button>
            )}
            <span className="result-count">{shown.length} tickets</span>
          </div>
          {shown.length ? (
            view === 'board' ? (
              <Board boot={boot} tickets={shown} open={open} move={mutate} />
            ) : (
              <List boot={boot} tickets={shown} open={open} />
            )
          ) : (
            <div className="empty">
              <b>⌕</b>
              <h3>No tickets match</h3>
              <p>Clear a filter or create something new.</p>
            </div>
          )}
        </section>
      </main>
      {(ticket || create) && (
        <Drawer
          title={create ? 'Create ticket' : ticket!.identifier}
          close={close}
        >
          {create ? (
            <Create
              boot={boot}
              done={(t) => {
                setTickets((v) => [t, ...v])
                setCreate(false)
                setTicket(t)
              }}
              fail={setError}
            />
          ) : (
            <Detail ticket={ticket!} boot={boot} mutate={mutate} />
          )}
        </Drawer>
      )}
    </div>
  )
}
function State({
  title,
  body,
  retry,
}: {
  title: string
  body: string
  retry?: () => void
}) {
  return (
    <main className="center-state">
      <span className="mark">F</span>
      <h1>{title}</h1>
      <p>{body}</p>
      {retry && <button onClick={retry}>Try again</button>}
    </main>
  )
}
function Sidebar({
  boot,
  tickets,
  filters,
  setFilters,
}: {
  boot: Boot
  tickets: Ticket[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
}) {
  const router = useRouter()
  const actor = memberFor(boot, boot.actor.membershipId)
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark">F</span>
        <span>
          fitara <b>work</b>
        </span>
      </div>
      <Link className="workspace" href="/settings/workspace">
        <span className="workspace-avatar">FW</span>
        <span>
          <b>{boot.workspace.name}</b>
          <small>Software team</small>
        </span>
        <span>⌄</span>
      </Link>
      <nav aria-label="Workspace">
        <p>Workspace</p>
        <button
          className={!filters.status && !filters.project ? 'active' : ''}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              status: '',
              project: '',
            }))
          }
        >
          ⌂<span>My Work</span>
          <kbd>1</kbd>
        </button>
        <button
          className={filters.status === boot.statuses[0]?.id ? 'active' : ''}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              status: boot.statuses[0]?.id ?? '',
            }))
          }
        >
          ◇<span>Triage Inbox</span>
          <em>
            {tickets.filter((t) => t.statusId === boot.statuses[0]?.id).length}
          </em>
        </button>
        <button
          onClick={() => setFilters((current) => ({ ...current, status: '' }))}
        >
          ◉<span>Active Work</span>
        </button>
        <p>Pinned work</p>
        {boot.projects.map((p, i) => (
          <button
            key={p.id}
            className={filters.project === p.id ? 'active' : ''}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                project: current.project === p.id ? '' : p.id,
              }))
            }
          >
            <i className={`project-dot d${i}`} />
            <span>{p.name}</span>
          </button>
        ))}
        <ThemeControls />
      </nav>
      <div className="sidebar-bottom">
        {(boot.actor.role === 'owner' || boot.actor.role === 'admin') && (
          <div className="settings-links">
            <Link href="/settings/workspace">
              <I>⚙</I>Workspace settings
            </Link>
            <Link href="/settings/projects">
              <I>◆</I>Manage projects
            </Link>
            <Link href="/settings/members">
              <I>♙</I>Manage members
            </Link>
          </div>
        )}
        <Link className="account-link" href="/account">
          <I>⌘</I>Change password
        </Link>
        <button
          onClick={async () => {
            await authClient.signOut()
            router.push('/login')
          }}
        >
          <I>↪</I>Log out
        </button>
        <div className="profile">
          <span className="avatar">{initials(boot.actor.name)}</span>
          <span>
            <b>{boot.actor.name}</b>
            <small>{actor?.jobTitle ?? boot.actor.role}</small>
          </span>
          <span>•••</span>
        </div>
      </div>
    </aside>
  )
}
function ThemeControls() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(defaultTheme)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fitara-theme') ?? 'null')
      const background = saved?.background ?? defaultTheme.background
      if (
        saved &&
        /^#[0-9a-f]{6}$/i.test(saved.primary) &&
        /^#[0-9a-f]{6}$/i.test(saved.secondary) &&
        /^#[0-9a-f]{6}$/i.test(background)
      ) {
        const timer = setTimeout(() => setTheme({ ...saved, background }), 0)
        return () => clearTimeout(timer)
      }
    } catch {
      localStorage.removeItem('fitara-theme')
    }
  }, [])

  const apply = useCallback((next: typeof defaultTheme) => {
    document.documentElement.style.setProperty('--primary', next.primary)
    document.documentElement.style.setProperty('--secondary', next.secondary)
    document.documentElement.style.setProperty('--bg', next.background)
  }, [])

  useEffect(() => {
    apply(theme)
  }, [apply, theme])

  const update = (key: keyof typeof defaultTheme, value: string) => {
    const next = { ...theme, [key]: value }
    setTheme(next)
    localStorage.setItem('fitara-theme', JSON.stringify(next))
  }

  const reset = () => {
    setTheme(defaultTheme)
    localStorage.removeItem('fitara-theme')
  }

  return (
    <div className="theme-controls">
      <button
        className="theme-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden>◐</span>
        <span>Theme</span>
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="theme-panel">
          <label>
            <span>Primary color</span>
            <input
              type="color"
              value={theme.primary}
              onChange={(event) => update('primary', event.target.value)}
            />
          </label>
          <label>
            <span>Secondary color</span>
            <input
              type="color"
              value={theme.secondary}
              onChange={(event) => update('secondary', event.target.value)}
            />
          </label>
          <label>
            <span>Background color</span>
            <input
              type="color"
              value={theme.background}
              onChange={(event) => update('background', event.target.value)}
            />
          </label>
          <button className="theme-reset" type="button" onClick={reset}>
            Reset colors
          </button>
        </div>
      )}
    </div>
  )
}
function Stats({ tickets, boot }: { tickets: Ticket[]; boot: Boot }) {
  const cards = [
    { key: 'open', caption: 'Across active projects' },
    { key: 'assigned', caption: 'Ready to move forward' },
    { key: 'review', caption: 'Waiting for feedback' },
    { key: 'blocked', caption: 'Needs attention' },
  ] satisfies { key: TicketScope; caption: string }[]
  const counts = Object.fromEntries(
    cards.map(({ key }) => [
      key,
      tickets.filter((ticket) => matchesScope(ticket, key, boot)).length,
    ]),
  ) as Record<TicketScope, number>
  return (
    <section className="stat-grid">
      {cards.map(({ key, caption }) => (
        <article key={key}>
          <span>{scopeCopy[key].label}</span>
          <Link
            className="stat-number"
            href={`/tickets/${key}`}
            aria-label={`View ${counts[key]} ${scopeCopy[key].label.toLowerCase()}`}
          >
            {counts[key]}
          </Link>
          <small>{caption}</small>
        </article>
      ))}
    </section>
  )
}
function Select({
  label,
  value,
  change,
  items,
}: {
  label: string
  value: string
  change: (x: string) => void
  items: Ref[]
}) {
  return (
    <label className="filter">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => change(e.target.value)}>
        <option value="">{label}</option>
        {items.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
    </label>
  )
}
function Card({
  t,
  boot,
  open,
  move,
  index,
}: {
  t: Ticket
  boot: Boot
  open: (t: Ticket, e: React.MouseEvent) => void
  move: (id: string, b: object, m?: boolean) => void
  index: number
}) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const assignee = memberFor(boot, t.assigneeMembershipId)
  const { ref, handleRef, isDragging } = useSortable({
    id: t.id,
    index,
    group: t.statusId,
    data: { ticketId: t.id, statusId: t.statusId },
    disabled: boot.actor.role === 'viewer',
  })
  return (
    <article
      ref={ref}
      className={`ticket-card ${isDragging ? 'dragging' : ''}`}
    >
      <span className="drag-handle" aria-hidden>
        ⠿
      </span>
      <button
        ref={handleRef}
        className="card-open"
        aria-label={`${t.identifier}: ${t.title}. Open or drag to move.`}
        onPointerDown={(event) => {
          pointerStart.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={(event) => {
          const start = pointerStart.current
          pointerStart.current = null
          if (
            start &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6
          )
            open(t, event as unknown as React.MouseEvent)
        }}
        onClick={(event) => event.detail === 0 && open(t, event)}
      >
        <div className="card-meta">
          <span className={`priority ${t.priority}`}>
            {t.priority.toUpperCase()}
          </span>
          <span>{t.identifier}</span>
          {t.blocked && <span className="blocked">⊘ Blocked</span>}
        </div>
        <h3>{t.title}</h3>
        <div className="labels">
          {t.labels.map((l) => (
            <span className={`tag ${l.color}`} key={l.id}>
              {l.name}
            </span>
          ))}
        </div>
        <footer>
          <span className="type">
            {t.type === 'bug' ? '◆' : t.type === 'feature' ? '✦' : '□'} {t.type}
          </span>
          <span className="avatar mini">
            {assignee ? initials(assignee.name) : '—'}
          </span>
        </footer>
      </button>
      <label className="quick-move">
        <span className="sr-only">Move {t.identifier}</span>
        <select
          disabled={boot.actor.role === 'viewer'}
          value={t.statusId}
          onChange={(e) =>
            move(
              t.id,
              { statusId: e.target.value, expectedVersion: t.version },
              true,
            )
          }
        >
          {boot.statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </article>
  )
}
function Board({
  tickets,
  boot,
  open,
  move,
}: {
  tickets: Ticket[]
  boot: Boot
  open: (t: Ticket, e: React.MouseEvent) => void
  move: (id: string, b: object, m?: boolean) => void
}) {
  const canMove = boot.actor.role !== 'viewer'
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled || !canMove) return
        const source = event.operation.source,
          target = event.operation.target
        if (!source || !target) return
        const ticket = tickets.find((item) => item.id === source.id)
        const targetTicket = tickets.find((item) => item.id === target.id)
        const targetStatus =
          targetTicket?.statusId ??
          String(target.data?.statusId ?? '').replace('column:', '')
        if (!ticket || !targetStatus || ticket.id === targetTicket?.id) return
        move(
          ticket.id,
          {
            statusId: targetStatus,
            beforeTicketId: targetTicket?.id ?? null,
            expectedVersion: ticket.version,
          },
          true,
        )
      }}
    >
      <div className="board">
        {boot.statuses.map((s, i) => (
          <BoardColumn
            key={s.id}
            status={s}
            statusIndex={i}
            tickets={tickets}
            boot={boot}
            open={open}
            move={move}
          />
        ))}
      </div>
      <DragOverlay>
        <DragPreview tickets={tickets} />
      </DragOverlay>
    </DragDropProvider>
  )
}
function BoardColumn({
  status: s,
  statusIndex: i,
  tickets,
  boot,
  open,
  move,
}: {
  status: Ref
  statusIndex: number
  tickets: Ticket[]
  boot: Boot
  open: (t: Ticket, e: React.MouseEvent) => void
  move: (id: string, b: object, m?: boolean) => void
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `column:${s.id}`,
    data: { statusId: s.id },
  })
  const columnTickets = tickets
    .filter((t) => t.statusId === s.id)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  return (
    <section
      ref={ref}
      className={`column ${isDropTarget ? 'drop-target' : ''}`}
    >
      <header>
        <i className={`status-dot s${i}`} />
        <h3>{s.name}</h3>
        <em>{columnTickets.length}</em>
      </header>
      <div>
        {columnTickets.map((t, index) => (
          <Card
            key={t.id}
            t={t}
            boot={boot}
            open={open}
            move={move}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}
function DragPreview({ tickets }: { tickets: Ticket[] }) {
  const operation = useDragOperation()
  const ticket = tickets.find((item) => item.id === operation.source?.id)
  return ticket ? (
    <div className="drag-preview" aria-hidden>
      {ticket.identifier} · {ticket.title}
    </div>
  ) : null
}
function List({
  tickets,
  boot,
  open,
}: {
  tickets: Ticket[]
  boot: Boot
  open: (t: Ticket, e: React.MouseEvent) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Status</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Labels</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr
              key={t.id}
              tabIndex={0}
              onClick={(e) => open(t, e as unknown as React.MouseEvent)}
              onKeyDown={(e) =>
                e.key === 'Enter' && open(t, e as unknown as React.MouseEvent)
              }
            >
              <td>
                <b>{t.identifier}</b>
                <span>{t.title}</span>
              </td>
              <td>{boot.statuses.find((s) => s.id === t.statusId)?.name}</td>
              <td>{t.type}</td>
              <td>
                <span className={`priority ${t.priority}`}>
                  {t.priority.toUpperCase()}
                </span>
              </td>
              <td>
                {memberFor(boot, t.assigneeMembershipId)?.name ?? 'Unassigned'}
                {memberFor(boot, t.assigneeMembershipId)?.jobTitle && (
                  <small className="member-role">
                    {memberFor(boot, t.assigneeMembershipId)?.jobTitle}
                  </small>
                )}
              </td>
              <td>
                <div className="labels">
                  {t.labels.map((l) => (
                    <span className={`tag ${l.color}`} key={l.id}>
                      {l.name}
                    </span>
                  ))}
                </div>
              </td>
              <td>{t.dueDate || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function Drawer({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', fn)
    return () => removeEventListener('keydown', fn)
  }, [close])
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <b>{title}</b>
          <button onClick={close} aria-label="Close drawer">
            ×
          </button>
        </header>
        {children}
      </aside>
    </div>
  )
}
const Field = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
)
function Create({
  boot,
  done,
  fail,
}: {
  boot: Boot
  done: (t: Ticket) => void
  fail: (x: string) => void
}) {
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const f = new FormData(e.currentTarget)
    try {
      done(
        await api('/api/v1/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: f.get('project'),
            title: f.get('title'),
            description: f.get('description'),
            type: f.get('type'),
            priority: f.get('priority'),
            statusId: f.get('status'),
            assigneeMembershipId: f.get('assignee') || null,
            labelIds: f.getAll('label'),
            dueDate: f.get('due') || null,
          }),
        }),
      )
    } catch (x) {
      fail(x instanceof Error ? x.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="drawer-form" onSubmit={submit}>
      <h2>Capture new work</h2>
      <p>Start simple. Add more context when it matters.</p>
      <Field label="Project">
        <select name="project">
          {boot.projects.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title">
        <input
          name="title"
          required
          maxLength={200}
          autoFocus
          placeholder="What needs to be done?"
        />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={5} />
      </Field>
      <div className="form-grid">
        <Field label="Type">
          <select name="type">
            {['task', 'bug', 'feature', 'improvement'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select name="priority">
            {['p1', 'p2', 'p3', 'p4'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status">
            {boot.statuses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assignee">
          <select name="assignee">
            <option value="">Unassigned</option>
            {boot.members.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.jobTitle ? ` — ${x.jobTitle}` : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Due date">
        <input name="due" type="date" />
      </Field>
      <fieldset>
        <legend>Labels</legend>
        <div className="check-row">
          {boot.labels.map((x) => (
            <label key={x.id}>
              <input name="label" value={x.id} type="checkbox" />
              {x.name}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="save-button" disabled={busy}>
        {busy ? 'Creating…' : 'Create ticket'}
      </button>
    </form>
  )
}
function Detail({
  ticket,
  boot,
  mutate,
}: {
  ticket: Ticket
  boot: Boot
  mutate: (id: string, b: object) => void
}) {
  const [edit, setEdit] = useState(false)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    void mutate(ticket.id, {
      expectedVersion: ticket.version,
      title: f.get('title'),
      description: f.get('description'),
      type: f.get('type'),
      priority: f.get('priority'),
      statusId: f.get('status'),
      assigneeMembershipId: f.get('assignee') || null,
      dueDate: f.get('due') || null,
      blocked: f.get('blocked') === 'on',
      ...Object.fromEntries(
        ticketDetailFields.map(({ key }) => [key, f.get(key)]),
      ),
    })
    setEdit(false)
  }
  if (edit)
    return (
      <form className="drawer-form" onSubmit={submit}>
        <Field label="Title">
          <input name="title" defaultValue={ticket.title} />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            rows={7}
            defaultValue={ticket.description}
          />
        </Field>
        <div className="form-grid">
          <Field label="Type">
            <select name="type" defaultValue={ticket.type}>
              {['task', 'bug', 'feature', 'improvement'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue={ticket.priority}>
              {['p1', 'p2', 'p3', 'p4'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={ticket.statusId}>
              {boot.statuses.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assignee">
            <select
              name="assignee"
              defaultValue={ticket.assigneeMembershipId || ''}
            >
              <option value="">Unassigned</option>
              {boot.members.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                  {x.jobTitle ? ` — ${x.jobTitle}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Due date">
          <input name="due" type="date" defaultValue={ticket.dueDate || ''} />
        </Field>
        <label className="mine">
          <input
            name="blocked"
            type="checkbox"
            defaultChecked={ticket.blocked}
          />
          Blocked
        </label>
        <section className="supplemental-edit">
          <h2>Additional ticket details</h2>
          <p>Use one item per line where a field contains multiple entries.</p>
          {ticketDetailFields.map(({ key, label }) => (
            <Field label={label} key={key}>
              <textarea name={key} rows={3} defaultValue={ticket[key]} />
            </Field>
          ))}
        </section>
        <button className="save-button">Save changes</button>
      </form>
    )
  return (
    <div className="ticket-detail">
      <div className="detail-heading">
        <span className={`priority ${ticket.priority}`}>
          {ticket.priority.toUpperCase()}
        </span>
        {boot.actor.role !== 'viewer' && (
          <button onClick={() => setEdit(true)}>Edit ticket</button>
        )}
      </div>
      <h1>{ticket.title}</h1>
      <p className="description">
        {ticket.description || 'No description yet.'}
      </p>
      <dl className="properties">
        <div>
          <dt>Status</dt>
          <dd>{boot.statuses.find((x) => x.id === ticket.statusId)?.name}</dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>{boot.projects.find((x) => x.id === ticket.projectId)?.name}</dd>
        </div>
        <div>
          <dt>Assignee</dt>
          <dd>
            {memberFor(boot, ticket.assigneeMembershipId)?.name ?? 'Unassigned'}
          </dd>
        </div>
        <div>
          <dt>Reporter</dt>
          <dd>
            {memberFor(boot, ticket.reporterMembershipId)?.name ?? 'Unknown'}
          </dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>{ticket.dueDate || 'None'}</dd>
        </div>
        <div>
          <dt>Blocked</dt>
          <dd>{ticket.blocked ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
      <div className="labels">
        {ticket.labels.map((l) => (
          <span className={`tag ${l.color}`} key={l.id}>
            {l.name}
          </span>
        ))}
      </div>
      <section className="activity">
        <h2>Recent activity</h2>
        {ticket.activity?.map((a) => (
          <p key={a.id}>
            <span>✓</span>
            <b>{a.action.replaceAll('.', ' ')}</b>
            <time>{new Date(a.createdAt).toLocaleDateString()}</time>
          </p>
        ))}
      </section>
      <section className="later">
        <div className="detail-section-heading">
          <h2>Additional details</h2>
          {boot.actor.role !== 'viewer' && (
            <button onClick={() => setEdit(true)}>Edit details</button>
          )}
        </div>
        <div className="supplemental-grid">
          {ticketDetailFields.map(({ key, label }) => (
            <article className={ticket[key] ? 'populated' : ''} key={key}>
              <h3>{label}</h3>
              <p>{ticket[key] || 'No information added yet.'}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
