// The installable app (plan.md M6): service worker, install state and Web Push (spec §12).

/** The offline shell and push live in public/sw.js. */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
