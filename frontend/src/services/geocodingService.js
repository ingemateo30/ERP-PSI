// Servicio de geocodificación con Nominatim (OpenStreetMap)
// Optimizado para direcciones colombianas con consultas estructuradas

const CACHE_KEY = 'geocoding_cache_v2';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 días para resultados exitosos
const NULL_TTL  = 24 * 60 * 60 * 1000;       // 24h para nulls (permitir reintentos)

const leerCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    // Limpiar entradas expiradas
    const ahora = Date.now();
    const data = parsed.data || parsed;
    const limpio = {};
    for (const [key, entry] of Object.entries(data)) {
      if (!entry || !entry._ts) { limpio[key] = entry; continue; }
      const ttl = entry._null ? NULL_TTL : CACHE_TTL;
      if (ahora - entry._ts < ttl) limpio[key] = entry;
    }
    return limpio;
  } catch { return {}; }
};

const guardarCache = (data) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data })); } catch {}
};

// Limpiar cache viejo v1 si existe
try { localStorage.removeItem('geocoding_cache_v1'); } catch {}

// Cola global para respetar límite de 1 req/seg de Nominatim
let ultimaLlamada = 0;
const esperarRateLimite = () => new Promise(resolve => {
  const ahora = Date.now();
  const espera = Math.max(0, ultimaLlamada + 1100 - ahora);
  ultimaLlamada = ahora + espera;
  setTimeout(resolve, espera);
});

/**
 * Normaliza direcciones colombianas para mejorar geocodificación.
 * Ej: "CL 5 # 10-30" → "Calle 5 10-30"
 *     "KR 15 No 8-42" → "Carrera 15 8-42"
 *     "TV 3 BIS A # 2-15" → "Transversal 3 BIS A 2-15"
 */
const normalizarDireccionColombia = (dir) => {
  if (!dir) return '';
  let d = dir.trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

  // Expandir abreviaturas comunes
  d = d
    .replace(/\bCLL?\b\.?/g, 'CALLE')
    .replace(/\bCR[A]?\b\.?/g, 'CARRERA')
    .replace(/\bKR[A]?\b\.?/g, 'CARRERA')
    .replace(/\bK\b\.?/g, 'CARRERA')
    .replace(/\bTV\b\.?/g, 'TRANSVERSAL')
    .replace(/\bDG\b\.?/g, 'DIAGONAL')
    .replace(/\bAV\b\.?/g, 'AVENIDA')
    .replace(/\bMZ\b\.?/g, 'MANZANA')
    .replace(/\bBRR\b\.?/g, 'BARRIO');

  // Eliminar #, No., Nro que confunden a Nominatim
  d = d.replace(/\s*#\s*/g, ' ').replace(/\s*N[oO]\.?\s*/g, ' ').replace(/\s*NRO\.?\s*/g, ' ');

  // Limpiar espacios dobles
  d = d.replace(/\s+/g, ' ').trim();

  return d;
};

/**
 * Hace una consulta estructurada a Nominatim.
 * Usa parámetros separados (street, city, state, country) para mayor precisión.
 */
const consultarNominatimEstructurado = async (street, city, state) => {
  await esperarRateLimite();
  try {
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      countrycodes: 'co',
      country: 'Colombia',
    });
    if (street) params.set('street', street);
    if (city) params.set('city', city);
    if (state) params.set('state', state);

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ERP-PSI/1.0' } });
    const data = await res.json();
    if (data?.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        _precision: data[0].type || 'unknown',
      };
    }
  } catch { /* ignorar */ }
  return null;
};

/**
 * Hace una consulta libre a Nominatim (fallback).
 */
const consultarNominatimLibre = async (q) => {
  await esperarRateLimite();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=co`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ERP-PSI/1.0' } });
    const data = await res.json();
    if (data?.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        _precision: data[0].type || 'unknown',
      };
    }
  } catch { /* ignorar */ }
  return null;
};

/**
 * Determina si un resultado es a nivel de calle (no solo ciudad/municipio).
 */
const esResultadoCalleNivel = (resultado) => {
  if (!resultado || !resultado._precision) return false;
  const tiposCalleNivel = [
    'house', 'building', 'residential', 'address',
    'street', 'road', 'path', 'footway', 'tertiary',
    'secondary', 'primary', 'trunk', 'neighbourhood',
    'suburb', 'quarter', 'hamlet',
  ];
  return tiposCalleNivel.includes(resultado._precision);
};

/**
 * Geocodifica una dirección colombiana con múltiples estrategias.
 * Retorna { lat, lng, _nivel: 'calle'|'barrio'|'ciudad' } o null.
 */
export const geocodificarDireccion = async (direccion, barrio, ciudad, departamento) => {
  const cache = leerCache();

  // Clave única de caché
  const key = [direccion, barrio, ciudad, departamento].filter(Boolean).join('|').toLowerCase().trim();
  if (cache[key]) {
    if (cache[key]._null) return null;
    return { lat: cache[key].lat, lng: cache[key].lng, _nivel: cache[key]._nivel || 'ciudad' };
  }

  const dirNorm = normalizarDireccionColombia(direccion);

  // ── Estrategia 1: Consulta estructurada con dirección normalizada ──
  if (dirNorm) {
    const r1 = await consultarNominatimEstructurado(dirNorm, ciudad, departamento);
    if (r1 && esResultadoCalleNivel(r1)) {
      const resultado = { lat: r1.lat, lng: r1.lng, _nivel: 'calle', _ts: Date.now() };
      cache[key] = resultado; guardarCache(cache);
      return { lat: r1.lat, lng: r1.lng, _nivel: 'calle' };
    }
  }

  // ── Estrategia 2: Consulta libre con dirección completa ──
  if (direccion) {
    const q2 = [dirNorm || direccion, barrio, ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
    const r2 = await consultarNominatimLibre(q2);
    if (r2 && esResultadoCalleNivel(r2)) {
      const resultado = { lat: r2.lat, lng: r2.lng, _nivel: 'calle', _ts: Date.now() };
      cache[key] = resultado; guardarCache(cache);
      return { lat: r2.lat, lng: r2.lng, _nivel: 'calle' };
    }
    // Si no fue nivel calle, guardar como barrio si al menos resolvió algo
    if (r2) {
      const resultado = { lat: r2.lat, lng: r2.lng, _nivel: 'barrio', _ts: Date.now() };
      cache[key] = resultado; guardarCache(cache);
      return { lat: r2.lat, lng: r2.lng, _nivel: 'barrio' };
    }
  }

  // ── Estrategia 3: Barrio + ciudad (consulta estructurada) ──
  if (barrio) {
    const r3 = await consultarNominatimEstructurado(barrio, ciudad, departamento);
    if (r3) {
      const resultado = { lat: r3.lat, lng: r3.lng, _nivel: 'barrio', _ts: Date.now() };
      cache[key] = resultado; guardarCache(cache);
      return { lat: r3.lat, lng: r3.lng, _nivel: 'barrio' };
    }
  }

  // ── Estrategia 4: Solo ciudad (último recurso) ──
  if (ciudad) {
    const q4 = [ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
    const r4 = await consultarNominatimLibre(q4);
    if (r4) {
      const resultado = { lat: r4.lat, lng: r4.lng, _nivel: 'ciudad', _ts: Date.now() };
      cache[key] = resultado; guardarCache(cache);
      return { lat: r4.lat, lng: r4.lng, _nivel: 'ciudad' };
    }
  }

  // No se encontró — marcar como null con timestamp (se reintentará tras 24h)
  cache[key] = { _null: true, _ts: Date.now() };
  guardarCache(cache);
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
      if (cache[key] && !cache[key]._null) {
        onResultado?.(item.id, {
          lat: cache[key].lat,
          lng: cache[key].lng,
          _nivel: cache[key]._nivel || 'ciudad'
        });
      }
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

/**
 * Limpia el cache de geocodificación para forzar re-consultas.
 */
export const limpiarCacheGeocodificacion = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('geocoding_cache_v1');
  } catch {}
};
