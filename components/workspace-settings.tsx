'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'

type TaxonomyType = 'role' | 'job_category' | 'job_function'
type Item = {
  id: string
  type: TaxonomyType
  name: string
  description: string
  color: string
}
type WorkspaceData = {
  workspace: { id: string; name: string; slug: string }
  taxonomy: Item[]
}
const sections: { type: TaxonomyType; title: string; help: string }[] = [
  {
    type: 'role',
    title: 'Team roles',
    help: 'Describe delivery responsibilities, such as Tech Lead or Product Owner.',
  },
  {
    type: 'job_category',
    title: 'Job categories',
    help: 'Group related disciplines, such as Engineering, Product, or Quality.',
  },
  {
    type: 'job_function',
    title: 'Job functions',
    help: 'Capture specialties, such as Frontend, Backend, DevOps, or QA Automation.',
  },
]

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
        .then(setData)
        .catch((reason) => setError(reason.message)),
    [],
  )
  useEffect(() => void load(), [load])

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/v1/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      })
      setNotice('Workspace details saved.')
      setError('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed')
    }
  }

  async function createItem(
    type: TaxonomyType,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/v1/workspace/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...Object.fromEntries(form) }),
      })
      event.currentTarget.reset()
      setNotice('Workspace item created.')
      setError('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Creation failed')
    }
  }

  async function remove(item: Item) {
    if (!confirm(`Delete “${item.name}”? Member assignments will be cleared.`))
      return
    try {
      await api(`/api/v1/workspace/taxonomy/${item.type}/${item.id}`, {
        method: 'DELETE',
      })
      setNotice('Workspace item deleted.')
      setError('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Deletion failed')
    }
  }

  if (!data)
    return (
      <main className="admin-page">
        <p>{error || 'Loading workspace settings…'}</p>
      </main>
    )

  return (
    <main className="admin-page workspace-settings-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Workspace settings</h1>
        <p>Edit your workspace and organize how your team works.</p>
      </header>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <form
        className="settings-card workspace-details"
        onSubmit={saveWorkspace}
      >
        <div>
          <span className="settings-icon">FW</span>
          <h2>Workspace details</h2>
          <p>The name and URL label shown to everyone in this workspace.</p>
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

      <div className="taxonomy-grid">
        {sections.map((section) => {
          const items = data.taxonomy.filter(
            (item) => item.type === section.type,
          )
          return (
            <section className="settings-card taxonomy-card" key={section.type}>
              <header>
                <h2>{section.title}</h2>
                <p>{section.help}</p>
              </header>
              <form onSubmit={(event) => void createItem(section.type, event)}>
                <input
                  name="name"
                  placeholder="Name"
                  maxLength={100}
                  required
                />
                <input
                  name="description"
                  placeholder="What is this used for?"
                  maxLength={500}
                />
                <label className="color-field">
                  <span>Color</span>
                  <input name="color" type="color" defaultValue="#6957e8" />
                </label>
                <button type="submit">＋ Add</button>
              </form>
              <div className="taxonomy-list">
                {items.map((item) => (
                  <article key={item.id}>
                    <i style={{ background: item.color }} />
                    <span>
                      <b>{item.name}</b>
                      <small>{item.description || 'No description'}</small>
                    </span>
                    <button onClick={() => void remove(item)}>Delete</button>
                  </article>
                ))}
                {!items.length && (
                  <p className="empty-row">Nothing created yet.</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
