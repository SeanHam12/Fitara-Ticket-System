export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message)
  }
}
export const notFound = (message = 'The requested resource was not found.') =>
  new AppError(404, 'NOT_FOUND', message)
export const forbidden = (
  message = 'You do not have access to this resource.',
) => new AppError(403, 'FORBIDDEN', message)
export const unauthorized = (message = 'Sign in to continue.') =>
  new AppError(401, 'UNAUTHORIZED', message)
export const conflict = (
  message = 'The resource changed. Refresh and try again.',
) => new AppError(409, 'VERSION_CONFLICT', message)
