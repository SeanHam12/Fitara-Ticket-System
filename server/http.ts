import { AppError } from './errors'
import { ZodError } from 'zod'
import { forbidden } from './errors'

export function ok(data: unknown, status = 200, requestId?: string) {
  return Response.json(
    { data, meta: { requestId } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )
}
export function problem(error: unknown, requestId: string) {
  const app =
    error instanceof AppError
      ? error
      : error instanceof ZodError
        ? new AppError(
            422,
            'VALIDATION_FAILED',
            'Check the highlighted fields.',
            error.flatten().fieldErrors as Record<string, string[]>,
          )
        : new AppError(500, 'INTERNAL_ERROR', 'Something went wrong.')
  return Response.json(
    {
      type: `https://fitara.invalid/problems/${app.code.toLowerCase()}`,
      title: app.code.replaceAll('_', ' '),
      status: app.status,
      detail: app.message,
      code: app.code,
      errors: app.errors,
      correlationId: requestId,
    },
    {
      status: app.status,
      headers: {
        'Content-Type': 'application/problem+json',
        'Cache-Control': 'private, no-store',
      },
    },
  )
}
export async function handle(fn: (requestId: string) => Promise<Response>) {
  const id = crypto.randomUUID()
  try {
    return await fn(id)
  } catch (error) {
    if (!(error instanceof AppError || error instanceof ZodError))
      console.error('Request failed', {
        requestId: id,
        error: error instanceof Error ? error.message : 'unknown',
      })
    return problem(error, id)
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || !host || new URL(origin).host !== host)
    throw forbidden('This mutation must come from the Fitara Work origin.')
}
