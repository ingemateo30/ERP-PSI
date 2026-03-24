// Servicio de geocodificación con Nominatim (OpenStreetMap)
// Cache persistente en localStorage — geocodifica solo una vez por dirección única

const CACHE_KEY = 'geocoding_cache_v1';
const CACHE_TTL = 60 * 24 * 60 * 60 * 1000; // 60 días

const leerCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return {}; }
    return data;
  } catch { return {}; }
};

const guardarCache = (data) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

// Cola global para respetar límite de 1 req/seg de Nominatim
let ultimaLlamada = 0;
const esperarRateLimite = () => new Promise(resolve => {
  const ahora = Date.now();
  const espera = Math.max(0, ultimaLlamada + 1100 - ahora);
  ultimaLlamada = ahora + espera;
  setTimeout(resolve, espera);
});

/**
 * Geocodifica una dirección colombiana.
 * Intenta con la dirección completa → barrio+ciudad → solo ciudad.
 * Retorna { lat, lng } o null si no encuentra.
 */
export const geocodificarDireccion = async (direccion, barrio, ciudad, departamento) => {
  const cache = leerCache();

  // Clave única de caché
  const key = [direccion, barrio, ciudad, departamento].filter(Boolean).join('|').toLowerCase().trim();
  if (cache[key]) return cache[key];

  const intentar = async (q) => {
    await esperarRateLimite();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=co`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ERP-PSI/1.0' } });
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { /* ignorar */ }
    return null;
  };

  // Intento 1: dirección completa
  if (direccion) {
    const q1 = [direccion, barrio, ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
    const r1 = await intentar(q1);
    if (r1) {
      cache[key] = r1; guardarCache(cache); return r1;
    }
  }

  // Intento 2: barrio + ciudad
  const q2 = [barrio, ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
  const r2 = await intentar(q2);
  if (r2) {
    cache[key] = r2; guardarCache(cache); return r2;
  }

  // Intento 3: solo ciudad
  const q3 = [ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
  const r3 = await intentar(q3);
  if (r3) {
    cache[key] = r3; guardarCache(cache); return r3;
  }

  // No se encontró — guardar null para no reintentar
  cache[key] = null; guardarCache(cache);
  return null;
};

/**
 * Geocodifica un lote de objetos {direccion, barrio, ciudad, departamento, id}.
 * Llama `onProgreso(actual, total)` y `onResultado(id, coords)` en streaming.
 */
export const geocodificarLote = async (items, { onProgreso, onResultado, señalAbort } = {}) => {
  const cache = leerCache();

  // Separar los que ya están en caché de los que hay que consultar
  const pendientes = [];
  for (const item of items) {
    const key = [item.direccion, item.barrio, item.ciudad, item.departamento].filter(Boolean).join('|').toLowerCase().trim();
    if (cache[key] !== undefined) {
      if (cache[key]) onResultado?.(item.id, cache[key]);
    } else {
      pendientes.push({ ...item, _key: key });
    }
  }

  const total = pendientes.length;
  let actual = 0;

  for (const item of pendientes) {
    if (señalAbort?.aborted) break;

    actual++;
    onProgreso?.(actual, total);

    const coords = await geocodificarDireccion(item.direccion, item.barrio, item.ciudad, item.departamento);
    if (coords) onResultado?.(item.id, coords);
  }
};
