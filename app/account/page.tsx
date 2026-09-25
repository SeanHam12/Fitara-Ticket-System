import { auth } from '@/server/auth/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/components/change-password-form'

export default async function AccountPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login')
  return <ChangePasswordForm />
}
