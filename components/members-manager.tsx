'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

export type Member = {
  id: string
  name: string
  username: string | null
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  jobTitle: string
  teamRoleId: string | null
  jobCategoryId: string | null
  jobFunctionId: string | null
  state: string
}
type TaxonomyItem = {
  id: string
  type: 'role' | 'job_category' | 'job_function'
  name: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json()
  if (!response.ok) throw new Error(body.detail || 'Request failed')
  return body.data
}

export function normalizeMembers(value: unknown): Member[] {
  if (!Array.isArray(value)) return []
  return value.filter((member): member is Member =>
    Boolean(
      member &&
      typeof member === 'object' &&
      typeof (member as Member).id === 'string' &&
      typeof (member as Member).name === 'string',
    ),
  )
}

export function MembersManager() {
  const [members, setMembers] = useState<Member[]>([])
  const [taxonomy, setTaxonomy] = useState<TaxonomyItem[]>([])
  const [actorRole, setActorRole] = useState<'owner' | 'admin'>('admin')
  const [error, setError] = useState('')

  const load = () =>
    Promise.all([
      request<unknown>('/api/v1/memberships'),
      request<{ actor?: { role?: 'owner' | 'admin' } }>('/api/v1/bootstrap'),
      request<{ taxonomy?: TaxonomyItem[] } | null>('/api/v1/workspace'),
    ])
      .then(([memberRows, boot, workspace]) => {
        setMembers(normalizeMembers(memberRows))
        setActorRole(boot?.actor?.role === 'owner' ? 'owner' : 'admin')
        setTaxonomy(
          Array.isArray(workspace?.taxonomy) ? workspace.taxonomy : [],
        )
        setError('')
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Unable to load users',
        ),
      )

  useEffect(() => {
    void load()
  }, [])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    try {
      await request('/api/v1/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      })
      form.reset()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'User creation failed')
    }
  }

  async function update(member: Member, change: object) {
    if (!window.confirm('Apply this membership change?')) return
    try {
      await request(`/api/v1/memberships/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      })
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'User update failed')
    }
  }

  const activeMembers = members.filter((member) => member.state === 'active')
  return (
    <main className="admin-page users-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Users</h1>
        <p>
          Manage real workspace accounts and descriptive team classifications.
        </p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <div className="users-layout">
        <form className="settings-card users-form" onSubmit={create}>
          <header>
            <h2>Add user</h2>
            <p>Authorization role and team role are intentionally separate.</p>
          </header>
          <label>
            Username
            <input
              name="username"
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9._-]+"
              required
            />
          </label>
          <label>
            Display name
            <input name="name" maxLength={100} required />
          </label>
          <div className="users-form-grid">
            <label>
              Authorization role
              <select name="role">
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                {actorRole === 'owner' && <option value="admin">Admin</option>}
                {actorRole === 'owner' && <option value="owner">Owner</option>}
              </select>
              <small>Controls security permissions.</small>
            </label>
            <label>
              Job title
              <input
                name="jobTitle"
                maxLength={100}
                defaultValue="Software Engineer"
                required
              />
            </label>
            <TaxonomySelect
              name="teamRoleId"
              label="Team role"
              type="role"
              items={taxonomy}
            />
            <TaxonomySelect
              name="jobCategoryId"
              label="Job category"
              type="job_category"
              items={taxonomy}
            />
            <TaxonomySelect
              name="jobFunctionId"
              label="Job function"
              type="job_function"
              items={taxonomy}
            />
          </div>
          <details className="credential-fields">
            <summary>
              Credential setup required by current authentication
            </summary>
            <p>
              Fitara Work does not create fake emails or default passwords.
              These values remain private and are never displayed in the user
              list.
            </p>
            <label>
              Internal email
              <input name="email" type="email" maxLength={320} required />
            </label>
            <label>
              Temporary password
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
          </details>
          <button className="new-button">Create user</button>
        </form>
        <section
          className="settings-card active-users"
          aria-labelledby="active-users-title"
        >
          <header>
            <h2 id="active-users-title">Active users</h2>
            <span>{activeMembers.length}</span>
          </header>
          {!activeMembers.length ? (
            <p>No active users are available.</p>
          ) : (
            activeMembers.map((member) => (
              <article key={member.id}>
                <div>
                  <b>{member.name}</b>
                  <span>
                    {member.username
                      ? `@${member.username}`
                      : 'No sign-in username'}
                  </span>
                </div>
                <dl>
                  <UserFact label="Permission" value={member.role} />
                  <UserFact
                    label="Team role"
                    value={taxonomyName(taxonomy, member.teamRoleId)}
                  />
                  <UserFact
                    label="Category"
                    value={taxonomyName(taxonomy, member.jobCategoryId)}
                  />
                  <UserFact
                    label="Function"
                    value={taxonomyName(taxonomy, member.jobFunctionId)}
                  />
                </dl>
                <div className="user-actions">
                  <select
                    aria-label={`Authorization role for ${member.name}`}
                    value={member.role}
                    disabled={
                      actorRole === 'admin' &&
                      ['owner', 'admin'].includes(member.role)
                    }
                    onChange={(event) =>
                      void update(member, { role: event.target.value })
                    }
                  >
                    {(actorRole === 'owner'
                      ? ['owner', 'admin', 'member', 'viewer']
                      : ['member', 'viewer']
                    ).map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    disabled={
                      actorRole === 'admin' &&
                      ['owner', 'admin'].includes(member.role)
                    }
                    onClick={() => void update(member, { state: 'suspended' })}
                  >
                    Suspend
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
      <p className="users-footnote">
        The selectors use the workspace&apos;s existing classification options.
        Editing those option definitions remains an administrative follow-up.
      </p>
    </main>
  )
}

function TaxonomySelect({
  name,
  label,
  type,
  items,
}: {
  name: string
  label: string
  type: TaxonomyItem['type']
  items: TaxonomyItem[]
}) {
  return (
    <label>
      {label}
      <select name={name}>
        <option value="">Not assigned</option>
        {items
          .filter((item) => item.type === type)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
      <small>Descriptive; does not grant access.</small>
    </label>
  )
}
function taxonomyName(items: TaxonomyItem[], id: string | null) {
  return id
    ? (items.find((item) => item.id === id)?.name ?? 'Unavailable')
    : 'Not assigned'
}
function UserFact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}
