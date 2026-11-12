'use client'

import { FormEvent, useState } from 'react'

export type CreatedPerson = { id: string; name: string; username: string }

export function AddUserForm({
  localDemo,
  onCreated,
  onCancel,
}: {
  localDemo: boolean
  onCreated: (person: CreatedPerson) => void | Promise<void>
  onCancel?: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const person = {
      username: String(fields.get('username') ?? ''),
      name: String(fields.get('name') ?? ''),
      function: String(fields.get('function') ?? ''),
    }
    const body = localDemo
      ? person
      : {
          ...person,
          email: String(fields.get('email') ?? ''),
          password: String(fields.get('password') ?? ''),
          role: 'member',
          jobTitle: person.function,
        }
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/v1/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          Object.values(result.errors ?? {})
            .flat()
            .join(' ') ||
            result.detail ||
            'Unable to create user.',
        )
      await onCreated(result.data)
      form.reset()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to create user.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="users-form" onSubmit={submit}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label>
        Username
        <input
          name="username"
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9._-]+"
          required
          autoFocus={Boolean(onCancel)}
        />
      </label>
      <label>
        Name
        <input name="name" maxLength={100} required />
      </label>
      <label>
        Function
        <input name="function" aria-label="Function" maxLength={100} required />
        <small>Describes work; does not grant access.</small>
      </label>
      {!localDemo && (
        <details className="credential-fields" open>
          <summary>Sign-in account setup</summary>
          <p>
            Shared workspaces require a real internal email and a temporary
            password.
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
      )}
      <div className="user-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button className="new-button" disabled={busy}>
          {busy ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </form>
  )
}
