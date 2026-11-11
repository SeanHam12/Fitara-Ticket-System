'use client'
import { FormEvent, useState } from 'react'
import Link from 'next/link'

export function ChangePasswordForm() {
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/v1/account/password-changed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: String(form.get('currentPassword') ?? ''),
        newPassword: String(form.get('newPassword') ?? ''),
      }),
    })
    setMessage(
      !response.ok
        ? 'Password could not be changed.'
        : 'Password changed successfully.',
    )
    if (response.ok) {
      event.currentTarget.reset()
    }
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link href="/">← Back to workspace</Link>
        <h1>Change password</h1>
        {message && <div role="status">{message}</div>}
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <button className="new-button">Change password</button>
      </form>
    </main>
  )
}
