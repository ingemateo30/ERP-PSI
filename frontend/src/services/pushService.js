// frontend/src/services/pushService.js
// Gestión de Web Push Notifications en el navegador

const API_URL = process.env.REACT_APP_API_URL || '/api/v1';

const getToken = () => localStorage.getItem('accessToken');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
});

// ─── Utilidades ──────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// ─── Registro del Service Worker ─────────────────────────────────────────────

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers no soportados en este navegador');
  }
  const registro = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registro;
}

// ─── Estado del permiso ───────────────────────────────────────────────────────

export function obtenerEstadoPermiso() {
  if (!('Notification' in window)) return 'no-soportado';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ─── Solicitar permiso ────────────────────────────────────────────────────────

export async function solicitarPermiso() {
  if (!('Notification' in window)) {
    throw new Error('Notificaciones no soportadas en este navegador');
  }
  const permiso = await Notification.requestPermission();
  return permiso; // 'granted' | 'denied' | 'default'
}

// ─── Suscribirse ──────────────────────────────────────────────────────────────

export async function suscribirse() {
  // 1. Obtener clave pública VAPID del servidor
  const respVapid = await fetch(`${API_URL}/push/vapid-public-key`, {
    headers: authHeaders()
  });
  const dataVapid = await respVapid.json();
  if (!dataVapid.success || !dataVapid.publicKey) {
    throw new Error(dataVapid.message || 'Push notifications no configuradas en el servidor');
  }

  // 2. Registrar service worker
  const registro = await registrarServiceWorker();

  // 3. Solicitar permiso si no está dado
  if (Notification.permission !== 'granted') {
    const permiso = await solicitarPermiso();
    if (permiso !== 'granted') {
      throw new Error('Permiso de notificaciones denegado');
    }
  }

  // 4. Suscribirse al push manager
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(dataVapid.publicKey)
  });

  // 5. Enviar suscripción al backend
  const { endpoint, keys } = suscripcion.toJSON();
  const resp = await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ endpoint, keys })
  });
  const data = await resp.json();
  if (!data.success) throw new Error(data.message || 'Error registrando suscripción');

  // Guardar endpoint localmente para poder cancelar
  localStorage.setItem('push_endpoint', endpoint);
  return suscripcion;
}

// ─── Cancelar suscripción ─────────────────────────────────────────────────────

export async function cancelarSuscripcion() {
  try {
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = await registro.pushManager.getSubscription();
    if (suscripcion) {
      const endpoint = suscripcion.endpoint;
      await suscripcion.unsubscribe();

      // Notificar al backend
      await fetch(`${API_URL}/push/unsubscribe`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ endpoint })
      });
      localStorage.removeItem('push_endpoint');
    }
  } catch (_) {}
}

// ─── Verificar si ya está suscrito ───────────────────────────────────────────

export async function estaSuscrito() {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const registro = await navigator.serviceWorker.ready;
    const suscripcion = await registro.pushManager.getSubscription();
    return !!suscripcion;
  } catch (_) { return false; }
}

// ─── Obtener estado desde el servidor ────────────────────────────────────────

export async function obtenerEstadoServidor() {
  try {
    const resp = await fetch(`${API_URL}/push/estado`, { headers: authHeaders() });
    return await resp.json();
  } catch (_) {
    return { success: false, data: { vapid_configurado: false, web_push_disponible: false } };
  }
}

// ─── Enviar push de prueba ────────────────────────────────────────────────────

export async function enviarPrueba() {
  const resp = await fetch(`${API_URL}/push/test`, {
    method: 'POST',
    headers: authHeaders()
  });
  return await resp.json();
}
