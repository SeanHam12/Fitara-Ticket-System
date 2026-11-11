'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'

type WorkspaceData = { workspace: { id: string; name: string; slug: string } }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json()
  if (!response.ok) throw new Error(body.detail || 'Request failed')
  return body.data
}

export function WorkspaceSettings() {
  const [data, setData] = useState<WorkspaceData>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(
    () =>
      api<WorkspaceData>('/api/v1/workspace')
        .then((value) => {
          if (!value?.workspace)
            throw new Error('Workspace data is unavailable.')
          setData(value)
        })
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load workspace',
          ),
        ),
    [],
  )
  useEffect(() => void load(), [load])

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await api('/api/v1/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      })
      setNotice('Workspace details saved.')
      setError('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed')
    }
  }

  if (!data?.workspace)
    return (
      <main className="admin-page">
        <p>{error || 'Loading workspace configuration…'}</p>
      </main>
    )

  return (
    <main className="admin-page workspace-settings-page compact-settings-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Workspace configuration</h1>
        <p>
          Update the workspace identity without mixing it with user management.
        </p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-banner" role="status">
          {notice}
        </div>
      )}
      <form
        className="settings-card workspace-details"
        onSubmit={saveWorkspace}
      >
        <div>
          <span className="settings-icon">FW</span>
          <h2>Workspace details</h2>
          <p>The name and URL label shown to this workspace.</p>
        </div>
        <label>
          Workspace name
          <input name="name" defaultValue={data.workspace.name} required />
        </label>
        <label>
          Workspace slug
          <input
            name="slug"
            defaultValue={data.workspace.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
        </label>
        <button className="new-button">Save workspace</button>
      </form>
      <section className="settings-card workspace-users-link">
        <div>
          <h2>Users and team classifications</h2>
          <p>
            Assign permissions, team roles, categories, and functions in one
            place.
          </p>
        </div>
        <Link href="/settings/members">Open Users</Link>
      </section>
    </main>
  )
}
