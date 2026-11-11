import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { getDevLoginBypassConfig } from '@/server/auth/dev-login-bypass'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; next?: string }>
}) {
  const query = await searchParams
  if (await auth.api.getSession({ headers: await headers() })) redirect('/')
  return (
    <LoginForm
      sessionExpired={query.expired === '1'}
      devBypassEnabled={Boolean(getDevLoginBypassConfig())}
      autoDemoAccess={Boolean(getDevLoginBypassConfig())}
      nextPath={query.next?.startsWith('/') ? query.next : '/'}
    />
  )
}
