import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'

const { signIn, push } = vi.hoisted(() => ({ signIn: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { username: signIn } },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

describe('username login', () => {
  beforeEach(() => {
    signIn.mockReset()
    push.mockReset()
    vi.unstubAllGlobals()
  })
  it.each([['wrong password'], ['unknown username']])(
    'uses the same generic error for %s',
    async () => {
      signIn.mockResolvedValue({ error: { message: 'private detail' } })
      render(<LoginForm />)
      await userEvent.type(screen.getByLabelText('Username'), 'unknown_user')
      await userEvent.type(
        screen.getByLabelText('Password'),
        'incorrect-password',
      )
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Invalid username or password.',
      )
      expect(screen.queryByText('private detail')).not.toBeInTheDocument()
    },
  )

  it('offers the explicitly enabled development bypass', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<LoginForm devBypassEnabled />)

    await userEvent.click(screen.getByRole('button', { name: 'Bypass' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/dev-login-bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('does not offer the development bypass by default', () => {
    render(<LoginForm />)
    expect(
      screen.queryByRole('button', { name: 'Bypass' }),
    ).not.toBeInTheDocument()
  })
})
