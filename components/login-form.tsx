'use client'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function LoginForm({
  sessionExpired = false,
  devBypassEnabled = false,
  autoDemoAccess = false,
  nextPath = '/',
}: {
  sessionExpired?: boolean
  devBypassEnabled?: boolean
  autoDemoAccess?: boolean
  nextPath?: string
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'signin' | 'bypass' | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading('signin')
    setError('')
    const form = new FormData(event.currentTarget)
    const result = await authClient.signIn.username({
      username: String(form.get('username') ?? '').trim(),
      password: String(form.get('password') ?? ''),
    })
    setLoading(null)
    if (result.error) setError('Invalid username or password.')
    else router.push(nextPath)
  }

  const bypass = useCallback(async () => {
    setLoading('bypass')
    setError('')
    const response = await fetch('/api/auth/dev-login-bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    setLoading(null)
    if (!response.ok) setError('Development bypass is unavailable.')
    else router.push(nextPath)
  }, [nextPath, router])

  useEffect(() => {
    if (autoDemoAccess) void Promise.resolve().then(bypass)
  }, [autoDemoAccess, bypass])

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="mark">F</span>
        <div className="auth-title-row">
          <h1>Sign in to Fitara Work</h1>
          {devBypassEnabled && (
            <button
              className="auth-bypass-button"
              type="button"
              disabled={loading !== null}
              onClick={bypass}
            >
              {loading === 'bypass' ? 'Bypassing…' : 'Bypass'}
            </button>
          )}
        </div>
        <p>
          {autoDemoAccess
            ? 'Opening the loopback-only local demo…'
            : 'Use your workspace username and password.'}
        </p>
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
        <button className="new-button" disabled={loading !== null}>
          {loading === 'signin' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
