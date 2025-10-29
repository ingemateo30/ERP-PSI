// frontend/src/services/calendarService.js
/**
 * Servicio para obtener eventos del calendario.
 * Intenta varias rutas/formatos de respuesta para ser robusto frente a variaciones en el backend.
 *
 * Devuelve un array en formato FullCalendar:
 * [
 *   {
 *     id,
 *     title,
 *     start, // ISO datetime
 *     end,   // opcional
 *     extendedProps: { ... } ,
 *     color || backgroundColor
 *   },
 *   ...
 * ]
 */

import api from './apiService'; // tu wrapper axios / fetch central (existe en /services)
 
export async function getCalendarEvents(params = {}) {
  // params soporta limit, desde, hasta, etc.
  const qs = new URLSearchParams(params).toString();
  const tryUrls = [
    `/instalaciones${qs ? '?' + qs : ''}`,                 // endpoint REST típico
    `/instalaciones/calendario${qs ? '?' + qs : ''}`,      // endpoint específico si existe
    `/api/v1/instalaciones${qs ? '?' + qs : ''}`,         // posibles prefijos
    `/api/v1/instalaciones/calendario${qs ? '?' + qs : ''}`
  ];

  let lastError = null;
  for (const url of tryUrls) {
    try {
      // Si 'api' es un axios wrapper, usamos api.get(url). Si no, podría reventar;
      // esto concuerda con otros servicios en tu repo.
      const res = await api.get(url);
      // axios normalmente pone datos en res.data
      const payload = res?.data ?? res;
      // buscaremos la lista dentro de payload
      const items = payload.instalaciones || payload.rows || payload.data || payload || [];
      if (!Array.isArray(items)) {
        // a veces payload puede ser { success: true, instalaciones: [...] }
        // si no es array, continuamos a la siguiente URL
        continue;
      }

      // Mapear a FullCalendar
      const mapped = items.map((it) => {
        // Campos según tu tabla:
        const id = it.id ?? it.instalacion_id ?? it._id;
        const fecha = it.fecha_programada ?? it.fecha ?? it.date;
        const hora = it.hora_programada ?? it.hora ?? it.time;
        // Construir ISO start. Si hora no existe, usar 08:00:00 como predeterminado
        const timePart = hora ? (hora.length === 8 ? hora : hora + ':00') : '08:00:00';
        const start = fecha ? `${fecha}T${timePart}` : null;

       const estado = typeof it.estado === 'string' ? it.estado.toLowerCase() : '';
const color =
  estado === 'completada' ? '#10B981' : // verde
  estado === 'cancelada' ? '#EF4444' : // rojo
  estado === 'reagendada' ? '#F59E0B' : // naranja
  '#2563EB'; // azul por defecto

       const clienteNombre = (it.cliente_nombre ?? it.cliente?.nombre ?? it.cliente) || null;
const instaladorNombre = (it.instalador_nombre ?? it.instalador?.nombre ?? it.instalador) || null;

        const titleParts = [];
        if (clienteNombre) titleParts.push(String(clienteNombre));
        if (it.tipo_instalacion) titleParts.push(String(it.tipo_instalacion));
        // fallback
        if (titleParts.length === 0) titleParts.push(`Instalación ${id}`);

        return {
          id,
          title: titleParts.join(' — '),
          start,
          end: start, // eventos puntuales
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            ...it,
            cliente_nombre: clienteNombre,
            instalador_nombre: instaladorNombre,
            hora_programada: hora,
          }
        };
      });

      return mapped;
    } catch (err) {
      lastError = err;
      // intentar siguiente URL
      // (console.log opcional)
      // console.warn('calendarService: fallo url', url, err);
    }
  }

  // Si llegamos aquí, no pudo ninguna URL
  throw lastError ?? new Error('No se encontraron endpoints válidos para instalaciones');
}

export default { getCalendarEvents };
