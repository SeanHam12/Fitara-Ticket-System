'use client'
import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'

type Member = {
  id: string
  name: string
  username: string
  email: string
  role: string
  state: string
  createdAt: string
  lastActiveAt: string | null
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init),
    body = await response.json()
  if (!response.ok) throw new Error(body.detail || 'Request failed')
  return body.data
}
export function MembersManager() {
  const [members, setMembers] = useState<Member[]>([]),
    [actorRole, setActorRole] = useState<'owner' | 'admin'>('admin'),
    [error, setError] = useState('')
  const load = () =>
    Promise.all([
      request<Member[]>('/api/v1/memberships'),
      request<{ actor: { role: 'owner' | 'admin' } }>('/api/v1/bootstrap'),
    ])
      .then(([memberRows, boot]) => {
        setMembers(memberRows)
        setActorRole(boot.actor.role)
      })
      .catch((e) => setError(e.message))
  useEffect(() => {
    void load()
  }, [])
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await request('/api/v1/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      })
      event.currentTarget.reset()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Account creation failed')
    }
  }
  async function update(member: Member, change: object) {
    if (!window.confirm('Apply this sensitive membership change?')) return
    try {
      await request(`/api/v1/memberships/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Membership update failed')
    }
  }
  async function issueTemporaryPassword(member: Member) {
    const temporaryPassword = window.prompt(
      'Enter a temporary password of 12–128 characters. It will not be displayed again.',
    )
    if (!temporaryPassword) return
    if (temporaryPassword.length < 12 || temporaryPassword.length > 128) {
      setError('Temporary passwords must contain 12–128 characters.')
      return
    }
    await update(member, { temporaryPassword })
  }
  return (
    <main className="admin-page">
      <header>
        <Link href="/">← Workspace</Link>
        <h1>Workspace members</h1>
        <p>Accounts use username sign-in; email remains internal.</p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      <form className="member-create" onSubmit={create}>
        <h2>Create account</h2>
        <label>
          Display name
          <input name="name" maxLength={100} required />
        </label>
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
          Internal email
          <input name="email" type="email" maxLength={320} required />
        </label>
        <label>
          Initial role
          <select name="role">
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            {actorRole === 'owner' && <option value="admin">Admin</option>}
            {actorRole === 'owner' && <option value="owner">Owner</option>}
          </select>
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
        <button className="new-button">Create user</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>State</th>
              <th>Created</th>
              <th>Last active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{member.username}</td>
                <td>{member.email}</td>
                <td>
                  <select
                    value={member.role}
                    disabled={actorRole === 'admin' && member.role === 'owner'}
                    onChange={(e) =>
                      void update(member, { role: e.target.value })
                    }
                  >
                    {(actorRole === 'owner'
                      ? ['owner', 'admin', 'member', 'viewer']
                      : ['member', 'viewer']
                    ).map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td>{member.state}</td>
                <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                <td>
                  {member.lastActiveAt
                    ? new Date(member.lastActiveAt).toLocaleString()
                    : 'Never'}
                </td>
                <td>
                  <button
                    disabled={actorRole === 'admin' && member.role === 'owner'}
                    onClick={() =>
                      void update(member, {
                        state:
                          member.state === 'active' ? 'suspended' : 'active',
                      })
                    }
                  >
                    {member.state === 'active' ? 'Suspend' : 'Restore'}
                  </button>
                  <button
                    disabled={actorRole === 'admin' && member.role === 'owner'}
                    onClick={() => void issueTemporaryPassword(member)}
                  >
                    Temporary password
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
