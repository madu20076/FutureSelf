// Structured error logging for beta.
// Errors write to server stderr — forward to Sentry / Datadog later.

export function logError(
  context: string,
  error: unknown,
  userId?: string
): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack   = error instanceof Error ? error.stack?.slice(0, 800) : undefined
  console.error(
    JSON.stringify({
      type:    'error',
      context,
      message,
      ...(stack  ? { stack }  : {}),
      ...(userId ? { userId } : {}),
      ts: new Date().toISOString(),
    })
  )
}
