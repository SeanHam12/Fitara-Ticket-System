import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { WorkspaceApp, type TicketScope } from '@/components/workspace-app'
import { auth } from '@/server/auth/auth'

const scopes = new Set<TicketScope>(['open', 'assigned', 'review', 'blocked'])

export default async function ScopedTicketsPage({
  params,
}: {
  params: Promise<{ scope: string }>
}) {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login')

  const { scope } = await params
  if (!scopes.has(scope as TicketScope)) notFound()

  return <WorkspaceApp ticketScope={scope as TicketScope} />
}
