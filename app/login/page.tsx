import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>
}) {
  if (await auth.api.getSession({ headers: await headers() })) redirect('/')
  return <LoginForm sessionExpired={(await searchParams).expired === '1'} />
}
