const ALLOWED_EVENTS = new Set([
  'frontend.error_boundary',
  'frontend.unhandled_rejection',
  'frontend.chunk_load_failed',
  'frontend.resource_error',
]);

const recentEvents = new Map<string, number>();

interface ClientEventPayload {
  event: string;
  message: string;
  stack?: string;
  component_stack?: string;
}

/**
 * Best-effort browser diagnostics. Never sends cookies, auth tokens, query
 * strings, request bodies, localStorage, or arbitrary objects.
 */
export function reportClientEvent(payload: ClientEventPayload): void {
  if (process.env.NODE_ENV !== 'production' || !ALLOWED_EVENTS.has(payload.event)) return;
  const message = String(payload.message || '').slice(0, 1000);
  const fingerprint = `${payload.event}:${message}:${window.location.pathname}`;
  const now = Date.now();
  if ((recentEvents.get(fingerprint) || 0) > now - 60_000) return;
  recentEvents.set(fingerprint, now);
  if (recentEvents.size > 100) {
    recentEvents.forEach((timestamp, key) => {
      if (timestamp <= now - 60_000) recentEvents.delete(key);
    });
  }
  const body = JSON.stringify({
    event: payload.event,
    message,
    stack: String(payload.stack || '').slice(0, 8000),
    component_stack: String(payload.component_stack || '').slice(0, 8000),
    path: window.location.pathname.slice(0, 500),
  });

  // keepalive avoids blocking navigation and page teardown. Credentials are
  // intentionally omitted because the endpoint accepts anonymous reports.
  void fetch('/u/client_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function installGlobalClientErrorHandlers(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientEvent({
      event: 'frontend.unhandled_rejection',
      message: reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection'),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  window.addEventListener('error', (event) => {
    // Resource load failures do not populate event.error.
    const resource = event.target instanceof HTMLElement
      ? event.target.getAttribute('src') || event.target.getAttribute('href') || ''
      : '';
    reportClientEvent({
      event: event.error ? 'frontend.error_boundary' : 'frontend.resource_error',
      message: event.error?.message || resource.split('?', 1)[0] || event.message || 'Resource load failed',
      stack: event.error?.stack,
    });
  }, true);
}
