'use client'
import { FormEvent, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function LoginForm({
  sessionExpired = false,
}: {
  sessionExpired?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await authClient.signIn.username({
      username: String(form.get('username') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    })
    setLoading(false)
    if (result.error) setError('Invalid username or password.')
    else router.push('/')
  }
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="mark">F</span>
        <h1>Sign in to Fitara Work</h1>
        <p>Use your workspace username and password.</p>
        {sessionExpired && (
          <div className="error-banner" role="status">
            Your session expired. Sign in again.
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            minLength={3}
            maxLength={32}
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <button className="new-button" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
