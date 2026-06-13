// Structured event logging for beta analytics.
// Events write to server stdout — forward to a provider (PostHog, Mixpanel, etc.) later.

export function trackEvent(
  event: string,
  metadata?: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      type: 'analytics',
      event,
      ...(metadata ? { metadata } : {}),
      ts: new Date().toISOString(),
    })
  )
}
