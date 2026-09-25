'use client'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
type Project = {
  id: string
  name: string
  slug: string
  key: string
  description: string
  archivedAt: string | null
  version: number
}
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init),
    body = await response.json()
  if (!response.ok) throw new Error(body.detail || 'Request failed')
  return body.data
}
export function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]),
    [error, setError] = useState('')
  const load = () =>
    api<Project[]>('/api/v1/projects?includeArchived=true')
      .then(setProjects)
      .catch((e) => setError(e.message))
  useEffect(() => {
    void load()
  }, [])
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      })
      event.currentTarget.reset()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Project creation failed')
    }
  }
  async function archive(project: Project) {
    if (
      !confirm(`${project.archivedAt ? 'Restore' : 'Archive'} ${project.name}?`)
    )
      return
    try {
      await api(`/api/v1/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived: !project.archivedAt,
          expectedVersion: project.version,
        }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Project update failed')
    }
  }
  return (
    <main className="admin-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Projects</h1>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <form className="member-create" onSubmit={create}>
        <h2>Create project</h2>
        <label>
          Name
          <input name="name" maxLength={100} required />
        </label>
        <label>
          Slug
          <input
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength={80}
            required
          />
        </label>
        <label>
          Key
          <input
            name="key"
            pattern="[A-Za-z][A-Za-z0-9]+"
            maxLength={10}
            required
          />
        </label>
        <label>
          Description
          <input name="description" maxLength={5000} />
        </label>
        <button className="new-button">Create project</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Slug</th>
              <th>State</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{project.key}</td>
                <td>{project.slug}</td>
                <td>{project.archivedAt ? 'Archived' : 'Active'}</td>
                <td>
                  <button onClick={() => void archive(project)}>
                    {project.archivedAt ? 'Restore' : 'Archive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
