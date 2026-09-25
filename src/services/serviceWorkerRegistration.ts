// Zamzam Field Operations Service Worker Registration & Lifecycle Manager

export interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  controller: boolean;
  hasUpdate: boolean;
  scope: string | null;
}

let updateWaitingWorker: ServiceWorker | null = null;
const updateListeners: Array<() => void> = [];

export function registerServiceWorker(onUpdateAvailable?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.info('[PWA] Service Worker not supported in this environment.');
    return;
  }

  // In development mode, unregister any active service worker to prevent request interception and 'Failed to fetch' errors
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    }).catch(() => {});
    return;
  }

  if (onUpdateAvailable) {
    updateListeners.push(onUpdateAvailable);
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] ServiceWorker registered with scope:', registration.scope);

      // Check if an update is waiting
      if (registration.waiting) {
        updateWaitingWorker = registration.waiting;
        updateListeners.forEach((fn) => fn());
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateWaitingWorker = installingWorker;
              console.log('[PWA] New content is available; please refresh.');
              updateListeners.forEach((fn) => fn());
            }
          });
        }
      });

      // Periodic check for SW updates (every 1 hour)
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);

      // Register background sync if supported
      if ('SyncManager' in window && (registration as any).sync) {
        try {
          await (registration as any).sync.register('zamzam-sync-queue');
          console.log('[PWA] Background Sync registered successfully.');
        } catch (syncErr) {
          console.log('[PWA] Background Sync registration ignored:', syncErr);
        }
      }
    } catch (error) {
      console.error('[PWA] ServiceWorker registration failed:', error);
    }
  });

  // Listen for messages from the service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_TRIGGERED_BY_SW') {
      window.dispatchEvent(new CustomEvent('zamzam:sw-sync'));
    }
  });
}

export function applyServiceWorkerUpdate(): void {
  if (updateWaitingWorker) {
    updateWaitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

export async function requestBackgroundSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register('zamzam-sync-queue');
      return true;
    }
  } catch (err) {
    console.warn('[PWA] Request background sync error:', err);
  }
  return false;
}

export function getServiceWorkerStatus(): ServiceWorkerStatus {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      supported: false,
      registered: false,
      active: false,
      controller: false,
      hasUpdate: false,
      scope: null,
    };
  }

  return {
    supported: true,
    registered: !!navigator.serviceWorker.controller,
    active: !!navigator.serviceWorker.controller,
    controller: !!navigator.serviceWorker.controller,
    hasUpdate: !!updateWaitingWorker,
    scope: navigator.serviceWorker.controller?.scriptURL || null,
  };
}
