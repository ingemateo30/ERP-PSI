// frontend/src/services/calendarService.js
import api from './apiService';
import { formatISO } from 'date-fns';

export async function getCalendarEvents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const tryUrls = [
    `/instalaciones${qs ? '?' + qs : ''}`,
    `/instalaciones/calendario${qs ? '?' + qs : ''}`,
    `/api/v1/instalaciones${qs ? '?' + qs : ''}`,
    `/api/v1/instalaciones/calendario${qs ? '?' + qs : ''}`,
  ];

  let allEvents = [];
  let lastError = null;

  // 1️⃣ Traemos las instalaciones
  for (const url of tryUrls) {
    try {
      const res = await api.get(url);
      const payload = res?.data ?? res;
      const items =
        payload?.instalaciones ||
        payload?.rows ||
        payload?.data ||
        (Array.isArray(payload) ? payload : []);
      if (!Array.isArray(items) || items.length === 0) continue;

      const mapped = items.map((it) => {
        const id = it.id ?? it.instalacion_id ?? it._id;
        const fecha = it.fecha_programada ?? it.fecha ?? it.date;
        const hora = it.hora_programada ?? it.hora ?? null;
        if (!fecha) return null;

        const start = fecha
          ? fecha.split('T')[0] + 'T' + (hora || '08:00:00')
          : null;

        const estado = (it.estado || '').toLowerCase();
        const color =
          estado === 'completada'
            ? '#10B981'
            : estado === 'cancelada'
            ? '#EF4444'
            : estado === 'reagendada'
            ? '#F59E0B'
            : estado === 'en_proceso'
            ? '#6366F1'
            : '#2563EB';

        const clienteNombre =
          it.cliente_nombre ?? (it.cliente && (it.cliente.nombre || it.cliente)) ?? null;
        const instaladorNombre =
          it.instalador_nombre ?? (it.instalador && (it.instalador.nombre || it.instalador)) ?? null;

        const titleParts = [];
        if (clienteNombre) titleParts.push(String(clienteNombre));
        if (it.tipo_instalacion) titleParts.push(String(it.tipo_instalacion));
        if (titleParts.length === 0) titleParts.push(`Instalación ${id}`);

        return {
          id,
          title: titleParts.join(' — '),
          start,
          end: start,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: '#fff',
          extendedProps: { ...it, cliente_nombre: clienteNombre, instalador_nombre: instaladorNombre, hora_programada: hora },
        };
      });

      allEvents = allEvents.concat(mapped.filter(Boolean));
      break; // si uno funciona, no probamos las otras URLs
    } catch (err) {
      console.warn('calendarService: fallo en', url, err.message);
      lastError = err;
    }
  }

  // 2️⃣ Traemos los contratos activos para marcar su fecha de fin
  try {
    const resContratos = await api.get('/contratos?activo=1');
    const contratos = resContratos?.data?.rows ?? resContratos?.data ?? [];
    contratos.forEach((c) => {
      if (!c.fecha_fin) return;

      allEvents.push({
        id: `contrato-${c.id}`,
        title: `Contrato ${c.numero_contrato} vence`,
        start: formatISO(new Date(c.fecha_fin), { representation: 'date' }),
        allDay: true,
        backgroundColor: '#FBBF24', // amarillo
        borderColor: '#FBBF24',
        textColor: '#000',
        extendedProps: { tipo: 'contrato', contrato: c },
      });
    });
  } catch (err) {
    console.warn('No se pudieron cargar contratos para el calendario', err.message);
  }

  // 3️⃣ Traemos facturas para marcar días de facturación electrónica
  try {
    const resFacturas = await api.get('/facturas?estado=pending,pagada,vencida');
    const facturas = resFacturas?.data?.rows ?? resFacturas?.data ?? [];
    facturas.forEach((f) => {
      const fecha = f.fecha_vencimiento ?? f.fecha_emision;
      if (!fecha) return;

      allEvents.push({
        id: `factura-${f.id}`,
        title: `Facturación ${f.numero_factura}`,
        start: formatISO(new Date(fecha), { representation: 'date' }),
        allDay: true,
        backgroundColor: '#3B82F6', // azul
        borderColor: '#3B82F6',
        textColor: '#fff',
        extendedProps: { tipo: 'factura', factura: f },
      });
    });
  } catch (err) {
    console.warn('No se pudieron cargar facturas para el calendario', err.message);
  }

  if (allEvents.length === 0) throw lastError ?? new Error('No se encontraron eventos válidos.');

  return allEvents;
}

export default { getCalendarEvents };
