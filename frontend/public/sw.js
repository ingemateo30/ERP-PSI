/* =====================================================
   PSI ERP — Service Worker
   Maneja recepción de push notifications en background
   ===================================================== */

const CACHE_NAME = 'psi-erp-v1';

// ── Instalación ──────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activación ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ── Recepción de Push ─────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'PSI ERP',
    body: 'Tienes una nueva notificación',
    icon: '/logo192.png',
    badge: '/logo192.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ],
    requireInteraction: false,
    timestamp: data.timestamp || Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Clic en notificación ──────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Si no hay ventana, abrir una nueva
      return clients.openWindow(url);
    })
  );
});

// ── Sincronización en background (opcional) ───────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-suscribirse si la suscripción expiró
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((subscription) => {
      // Notificar al backend de la nueva suscripción
      return fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
            auth:   btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
          }
        })
      });
    }).catch(() => {})
  );
});
