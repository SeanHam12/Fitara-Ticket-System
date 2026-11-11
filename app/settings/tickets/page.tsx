import { auth } from '@/server/auth/auth'
import { getDevLoginBypassConfig } from '@/server/auth/dev-login-bypass'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { TicketTrashManager } from '@/components/ticket-trash-manager'

export default async function TicketManagementPage() {
  if (!(await auth.api.getSession({ headers: await headers() }))) {
    if (getDevLoginBypassConfig()) redirect('/login?next=/settings/tickets')
    redirect('/login')
  }
  return <TicketTrashManager />
}
