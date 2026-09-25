'use client'
import { FormEvent, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

export function ChangePasswordForm() {
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await authClient.changePassword({
      currentPassword: String(form.get('currentPassword') ?? ''),
      newPassword: String(form.get('newPassword') ?? ''),
      revokeOtherSessions: true,
    })
    setMessage(
      result.error
        ? 'Password could not be changed.'
        : 'Password changed successfully.',
    )
    if (!result.error) {
      await fetch('/api/v1/account/password-changed', { method: 'POST' })
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
