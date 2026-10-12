// The installable app (plan.md M6): service worker, install state and Web Push (spec §12).
import { api } from './api';

/** The offline shell and push live in public/sw.js. */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

/** Chrome's install prompt, kept from page load so a button can open it later (Android). */
type InstallPrompt = Event & { prompt: () => Promise<void> };
let installPrompt: InstallPrompt | undefined;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e as InstallPrompt;
  });
}
export const canInstall = (): boolean => !!installPrompt;
export function install(): void {
  void installPrompt?.prompt();
  installPrompt = undefined;
}

export const isIPhone = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isInstalled = (): boolean =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Push needs a service worker and the Push API; on iPhone that only exists from the Home Screen. */
export type PushState = 'unsupported' | 'blocked' | 'off' | 'on';
export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? 'on' : 'off';
}

/** Asks for permission (call it from a tap) and stores the subscription with the API. */
export async function enablePush(): Promise<PushState> {
  if ((await Notification.requestPermission()) !== 'granted') return pushState();
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64url(process.env.VAPID_PUBLIC_KEY ?? ''),
  });
  await api('/push/subscriptions', { body: sub.toJSON() });
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api('/push/subscriptions', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(
      () => undefined,
    );
    await sub.unsubscribe();
  }
  return 'off';
}

function base64url(key: string): Uint8Array<ArrayBuffer> {
  const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
