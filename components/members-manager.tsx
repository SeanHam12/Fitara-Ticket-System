'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AddUserForm } from './add-user-form'

export type Member = {
  id: string
  name: string
  username: string | null
  email: string | null
  role: 'owner' | 'admin' | 'member' | 'viewer'
  jobTitle: string
  jobFunctionId: string | null
  state: 'active' | 'suspended' | 'removed'
}
type TaxonomyItem = { id: string; type: string; name: string }
type ActorRole = 'owner' | 'admin'

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
  const [actorRole, setActorRole] = useState<ActorRole>('admin')
  const [localDemo, setLocalDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, boot, workspace] = await Promise.all([
        request<unknown>('/api/v1/memberships'),
        request<{
          actor?: { role?: ActorRole; localDemoUserCreation?: boolean }
        }>('/api/v1/bootstrap'),
        request<{ taxonomy?: TaxonomyItem[] }>('/api/v1/workspace'),
      ])
      setMembers(normalizeMembers(rows))
      setActorRole(boot.actor?.role === 'owner' ? 'owner' : 'admin')
      setLocalDemo(boot.actor?.localDemoUserCreation === true)
      setTaxonomy(Array.isArray(workspace.taxonomy) ? workspace.taxonomy : [])
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  async function update(
    member: Member,
    change: object,
    confirmMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return
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

  function functionName(member: Member) {
    return (
      taxonomy.find((item) => item.id === member.jobFunctionId)?.name ??
      member.jobTitle
    )
  }

  const activeCount = members.filter(
    (member) => member.state === 'active',
  ).length
  return (
    <main className="admin-page users-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Users</h1>
        <p>Add people and manage their workspace access.</p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <div className="users-layout">
        <section
          className="settings-card users-create"
          aria-labelledby="add-user-title"
        >
          <header>
            <h2 id="add-user-title">Add user</h2>
          </header>
          {loading && !members.length ? (
            <p role="status">Loading form…</p>
          ) : (
            <AddUserForm localDemo={localDemo} onCreated={load} />
          )}
        </section>
        <section
          className="settings-card active-users"
          aria-labelledby="active-users-title"
        >
          <header>
            <h2 id="active-users-title">Users</h2>
            <span>{activeCount} active</span>
          </header>
          {loading ? (
            <p role="status">Loading users…</p>
          ) : !members.length ? (
            <p>No users are available.</p>
          ) : (
            members.map((member) => {
              const canManage =
                actorRole === 'owner' ||
                !['owner', 'admin'].includes(member.role)
              return (
                <article className="user-row" key={member.id}>
                  <div className="user-identity">
                    <b>{member.name}</b>
                    {member.username && <span>@{member.username}</span>}
                  </div>
                  <span className="user-function">{functionName(member)}</span>
                  <span className={`user-state ${member.state}`}>
                    {member.state}
                  </span>
                  {canManage && (
                    <details className="user-action-menu">
                      <summary aria-label={`Actions for ${member.name}`}>
                        ⋯
                      </summary>
                      <div className="user-action-panel">
                        {!member.username && <p>Username not set</p>}
                        <form
                          onSubmit={(event: FormEvent<HTMLFormElement>) => {
                            event.preventDefault()
                            const fields = new FormData(event.currentTarget)
                            void update(member, {
                              name: fields.get('name'),
                              jobFunction: fields.get('function'),
                            })
                          }}
                        >
                          <label>
                            Name
                            <input
                              name="name"
                              defaultValue={member.name}
                              required
                              maxLength={100}
                            />
                          </label>
                          <label>
                            Function
                            <input
                              name="function"
                              defaultValue={functionName(member)}
                              required
                              maxLength={100}
                            />
                          </label>
                          <button type="submit">Save details</button>
                        </form>
                        <label>
                          Permission
                          <select
                            aria-label={`Permission for ${member.name}`}
                            value={member.role}
                            onChange={(event) =>
                              void update(
                                member,
                                { role: event.target.value },
                                `Change ${member.name}'s permission?`,
                              )
                            }
                          >
                            {(actorRole === 'owner'
                              ? ['owner', 'admin', 'member', 'viewer']
                              : ['member', 'viewer']
                            ).map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </label>
                        {member.state === 'active' ? (
                          <button
                            type="button"
                            className="danger-text"
                            onClick={() =>
                              void update(
                                member,
                                { state: 'suspended' },
                                `Suspend ${member.name}? Their sessions will be revoked.`,
                              )
                            }
                          >
                            Suspend
                          </button>
                        ) : member.state === 'suspended' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void update(
                                member,
                                { state: 'active' },
                                `Restore ${member.name}?`,
                              )
                            }
                          >
                            Restore
                          </button>
                        ) : null}
                      </div>
                    </details>
                  )}
                </article>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
