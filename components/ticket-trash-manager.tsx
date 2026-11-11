'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type TicketRow = {
  id: string
  identifier: string
  title: string
  type: string
  priority: string
  projectId: string
  archivedAt?: string | null
}
type Boot = {
  workspace: { name: string }
  projects: { id: string; name: string }[]
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json()
  if (!response.ok) throw new Error(body.detail || 'Request failed')
  return body.data
}

export function TicketTrashManager() {
  const [active, setActive] = useState<TicketRow[]>([])
  const [trashed, setTrashed] = useState<TicketRow[]>([])
  const [boot, setBoot] = useState<Boot>()
  const [selected, setSelected] = useState<string[]>([])
  const [trashSelected, setTrashSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [tickets, bootstrap] = await Promise.all([
        api<{ active: TicketRow[]; trashed: TicketRow[] }>(
          '/api/v1/tickets/trash',
        ),
        api<Boot>('/api/v1/bootstrap'),
      ])
      setActive(tickets.active)
      setTrashed(tickets.trashed)
      setBoot(bootstrap)
      setSelected([])
      setTrashSelected([])
      setError('')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to load tickets',
      )
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function archive(all: boolean) {
    const count = all ? active.length : selected.length
    if (!count || !boot) return
    const message = all
      ? `Move all ${count} tickets in ${boot.workspace.name} to Trash?`
      : `Move ${count} selected ${count === 1 ? 'ticket' : 'tickets'} to Trash?`
    if (!window.confirm(`${message} You can restore them later.`)) return
    setBusy(true)
    try {
      await api('/api/v1/tickets/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          all
            ? { all: true, expectedCount: count }
            : { ticketIds: selected, expectedCount: count },
        ),
      })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function restore() {
    if (!trashSelected.length) return
    setBusy(true)
    try {
      await api('/api/v1/tickets/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds: trashSelected }),
      })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="admin-page ticket-management-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Ticket deletion</h1>
        <p>
          Move tickets to Trash without losing their keys or activity history.
        </p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <TicketSelectionTable
        title="Active tickets"
        tickets={active}
        selected={selected}
        setSelected={setSelected}
        projects={boot?.projects ?? []}
      />
      <div className="ticket-delete-actions">
        <button
          disabled={busy || !selected.length}
          onClick={() => void archive(false)}
        >
          Delete selected ({selected.length})
        </button>
        <button
          className="danger-button"
          disabled={busy || !active.length}
          onClick={() => void archive(true)}
        >
          Delete all tickets ({active.length})
        </button>
      </div>
      <TicketSelectionTable
        title={`Trash (${trashed.length})`}
        tickets={trashed}
        selected={trashSelected}
        setSelected={setTrashSelected}
        projects={boot?.projects ?? []}
        empty="Trash is empty."
      />
      <button
        disabled={busy || !trashSelected.length}
        onClick={() => void restore()}
      >
        Restore selected ({trashSelected.length})
      </button>
    </main>
  )
}

export function TicketSelectionTable({
  title,
  tickets,
  selected,
  setSelected,
  projects,
  empty = 'No active tickets.',
}: {
  title: string
  tickets: TicketRow[]
  selected: string[]
  setSelected: (ids: string[]) => void
  projects: { id: string; name: string }[]
  empty?: string
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const allSelected = tickets.length > 0 && selected.length === tickets.length
  const toggle = (id: string) =>
    setSelected(
      selectedSet.has(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    )
  return (
    <section className="settings-card ticket-selection-card">
      <header>
        <h2>{title}</h2>
      </header>
      {!tickets.length ? (
        <p>{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label={`Select all ${title.toLowerCase()}`}
                    checked={allSelected}
                    onChange={() =>
                      setSelected(
                        allSelected ? [] : tickets.map((ticket) => ticket.id),
                      )
                    }
                  />
                </th>
                <th>Ticket</th>
                <th>Project</th>
                <th>Type</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${ticket.identifier}`}
                      checked={selectedSet.has(ticket.id)}
                      onChange={() => toggle(ticket.id)}
                    />
                  </td>
                  <td>
                    <b>{ticket.identifier}</b>
                    <span>{ticket.title}</span>
                  </td>
                  <td>
                    {projects.find((project) => project.id === ticket.projectId)
                      ?.name ?? 'Unknown project'}
                  </td>
                  <td>{ticket.type}</td>
                  <td>{ticket.priority.toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
