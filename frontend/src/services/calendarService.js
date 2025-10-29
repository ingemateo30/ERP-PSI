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
 *     extendedProps: { ... },
 *     color || backgroundColor
 *   },
 *   ...
 * ]
 */

import api from './apiService'; // tu wrapper axios central

export async function getCalendarEvents(params = {}) {
  // params soporta limit, desde, hasta, etc.
  const qs = new URLSearchParams(params).toString();
  const tryUrls = [
    `/instalaciones${qs ? '?' + qs : ''}`,
    `/instalaciones/calendario${qs ? '?' + qs : ''}`,
    `/api/v1/instalaciones${qs ? '?' + qs : ''}`,
    `/api/v1/instalaciones/calendario${qs ? '?' + qs : ''}`,
  ];

  let lastError = null;

  for (const url of tryUrls) {
    try {
      const res = await api.get(url);
      const payload = res?.data ?? res;
      console.log("📦 Respuesta completa del backend calendario:", payload);
      const items =
        payload?.instalaciones ||
        payload?.rows ||
        payload?.data ||
        (Array.isArray(payload) ? payload : []);

      if (!Array.isArray(items) || items.length === 0) continue;

      // 🧠 Transformar las instalaciones en eventos para FullCalendar
      const mapped = items.map((it) => {
        const id = it.id ?? it.instalacion_id ?? it._id;
        const fecha = it.fecha_programada ?? it.fecha ?? it.date;
        const hora = it.hora_programada ?? it.hora ?? it.time;

        // Si no hay fecha, no se puede mostrar el evento
        if (!fecha) return null;

        const timePart = hora ? (hora.length === 8 ? hora : hora + ':00') : '08:00:00';
        const start = `${fecha}T${timePart}`;

        // 🟩 Color por estado
        const estado = typeof it.estado === 'string' ? it.estado.toLowerCase() : '';
        const color =
          estado === 'completada'
            ? '#10B981' // verde
            : estado === 'cancelada'
            ? '#EF4444' // rojo
            : estado === 'reagendada'
            ? '#F59E0B' // naranja
            : estado === 'en_proceso'
            ? '#6366F1' // morado
            : '#2563EB'; // azul por defecto

        // 🧍 Datos adicionales
        const clienteNombre =
          it.cliente_nombre ??
          (it.cliente && (it.cliente.nombre || it.cliente)) ??
          null;
        const instaladorNombre =
          it.instalador_nombre ??
          (it.instalador && (it.instalador.nombre || it.instalador)) ??
          null;

        // 🏷️ Título amigable
        const titleParts = [];
        if (clienteNombre) titleParts.push(String(clienteNombre));
        if (it.tipo_instalacion) titleParts.push(String(it.tipo_instalacion));
        if (titleParts.length === 0) titleParts.push(`Instalación ${id}`);

        return {
          id,
          title: titleParts.join(' — '),
          start,
          end: start,
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          extendedProps: {
            ...it,
            cliente_nombre: clienteNombre,
            instalador_nombre: instaladorNombre,
            hora_programada: hora,
          },
        };
      });

      // Filtramos los nulls
      return mapped.filter(Boolean);
    } catch (err) {
      console.warn('calendarService: fallo en', url, err.message);
      lastError = err;
    }
  
}
  

  // Si ninguna ruta respondió correctamente
  throw lastError ?? new Error('No se encontraron endpoints válidos para instalaciones.');
}

export default { getCalendarEvents };
