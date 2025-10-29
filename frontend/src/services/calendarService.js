// frontend/src/services/calendarService.js
import api from './apiService';
import { addMonths, parseISO, formatISO } from 'date-fns';

/**
 * Servicio que obtiene todos los eventos del calendario:
 * - Instalaciones (ya existente)
 * - Contratos: fecha de finalización
 * - Facturación electrónica mensual
 *
 * Devuelve array FullCalendar:
 * [
 *   {
 *     id,
 *     title,
 *     start,
 *     end,
 *     allDay,
 *     backgroundColor,
 *     borderColor,
 *     textColor,
 *     extendedProps: { ... },
 *   },
 *   ...
 * ]
 */

export async function getCalendarEvents(params = {}) {
  const allEvents = [];

  // -------------------
  // 1️⃣ Instalaciones
  // -------------------
  try {
    const instalaciones = await api.get('/instalaciones', { params });
    const items = instalaciones?.data?.instalaciones || instalaciones?.data || [];

    const instalacionEvents = items.map(it => {
      const id = it.id ?? it._id;
      const fecha = it.fecha_programada ?? it.fecha;
      const hora = it.hora_programada ?? '08:00:00';
      if (!fecha) return null;

      const start = fecha.split('T')[0] + 'T' + hora;

      const estado = (it.estado || '').toLowerCase();
      const color = estado === 'completada' ? '#10B981'
        : estado === 'cancelada' ? '#EF4444'
        : estado === 'reagendada' ? '#F59E0B'
        : estado === 'en_proceso' ? '#6366F1'
        : '#2563EB';

      const clienteNombre = it.cliente_nombre ?? (it.cliente?.nombre || it.cliente);
      const instaladorNombre = it.instalador_nombre ?? (it.instalador?.nombre || it.instalador);

      const titleParts = [];
      if (clienteNombre) titleParts.push(clienteNombre);
      if (it.tipo_instalacion) titleParts.push(it.tipo_instalacion);
      if (!titleParts.length) titleParts.push(`Instalación ${id}`);

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
    }).filter(Boolean);

    allEvents.push(...instalacionEvents);
  } catch (err) {
    console.warn('No se pudieron cargar instalaciones', err);
  }

  // -------------------
  // 2️⃣ Contratos
  // -------------------
  try {
    const resContratos = await api.get('/contratos', { params: { activo: 1 } });
    const contratos = resContratos?.data?.contratos || resContratos?.data || [];

    const contratosEvents = contratos.map(c => {
      if (!c.fecha_fin) return null;
      return {
        id: `contrato-${c.id}`,
        title: `Fin contrato ${c.numero_contrato}`,
        start: c.fecha_fin,
        allDay: true,
        backgroundColor: '#8B5CF6', // morado
        borderColor: '#8B5CF6',
        textColor: '#fff',
        extendedProps: { ...c, tipo: 'contrato' },
      };
    }).filter(Boolean);

    allEvents.push(...contratosEvents);
  } catch (err) {
    console.warn('No se pudieron cargar contratos', err);
  }

  // -------------------
  // 3️⃣ Facturación electrónica mensual
  // -------------------
  try {
    const resFacturas = await api.get('/facturas', { params: { estado: 'pending,pagada,vencida' } });
    const facturas = resFacturas?.data?.facturas || resFacturas?.data || [];

    const facturacionEvents = facturas.map(f => {
      if (!f.fecha) return null;

      const fechaInicio = parseISO(f.fecha);
      const fechaFin = addMonths(fechaInicio, 1);

      return {
        id: `factura-${f.id}`,
        title: `Factura ${f.numero || f.id}`,
        start: formatISO(fechaInicio, { representation: 'date' }),
        allDay: true,
        backgroundColor: '#FBBF24', // amarillo
        borderColor: '#FBBF24',
        textColor: '#000',
        extendedProps: { ...f, tipo: 'factura' },
      };
    }).filter(Boolean);

    allEvents.push(...facturacionEvents);
  } catch (err) {
    console.warn('No se pudieron cargar facturas', err);
  }

  return allEvents;
}

export default { getCalendarEvents };
