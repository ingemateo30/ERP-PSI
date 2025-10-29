// frontend/src/services/calendarService.js
import api from './apiService';
import { formatISO, addDays } from 'date-fns';

/**
 * Convierte contratos activos en eventos de calendario.
 * Solo toma fecha_fin y puede marcar un color fijo (ej: azul).
 */
async function getContractEvents(params = {}) {
  try {
    const res = await api.get('/contratos?activo=1');
    const items = Array.isArray(res.data)
      ? res.data
      : res.data?.contratos || [];

    return items.map((c) => {
      const start = c.fecha_fin ? formatISO(new Date(c.fecha_fin)) : null;
      if (!start) return null;

      return {
        id: `contrato-${c.id}`,
        title: `Contrato ${c.numero_contrato}`,
        start,
        end: start,
        allDay: true,
        backgroundColor: '#3B82F6', // azul
        borderColor: '#3B82F6',
        textColor: '#fff',
        extendedProps: {
          tipo: 'contrato',
          cliente_id: c.cliente_id,
          estado: c.estado,
          fecha_fin: c.fecha_fin,
        },
      };
    }).filter(Boolean);
  } catch (err) {
    console.warn('No se pudieron cargar contratos para el calendario', err);
    return [];
  }
}

/**
 * Convierte facturas pendientes/pagadas/vencidas en eventos de calendario.
 * Se puede usar fecha_vencimiento como start y marcar color por estado.
 */
async function getInvoiceEvents(params = {}) {
  try {
    const res = await api.get('/facturas?estado=pending,pagada,vencida');
    const items = Array.isArray(res.data)
      ? res.data
      : res.data?.facturas || [];

    return items.map((f) => {
      const start = f.fecha_vencimiento ? formatISO(new Date(f.fecha_vencimiento)) : null;
      if (!start) return null;

      let color = '#2563EB'; // azul por defecto
      if (f.estado === 'vencida') color = '#EF4444';
      else if (f.estado === 'pagada') color = '#10B981';
      else if (f.estado === 'pendiente') color = '#F59E0B';

      return {
        id: `factura-${f.id}`,
        title: `Factura ${f.numero_factura}`,
        start,
        end: start,
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#fff',
        extendedProps: {
          tipo: 'factura',
          cliente_id: f.cliente_id,
          estado: f.estado,
          fecha_emision: f.fecha_emision,
          fecha_vencimiento: f.fecha_vencimiento,
        },
      };
    }).filter(Boolean);
  } catch (err) {
    console.warn('No se pudieron cargar facturas para el calendario', err);
    return [];
  }
}

/**
 * Función principal que obtiene todos los eventos para FullCalendar
 */
export async function getCalendarEvents(params = {}) {
  // Primero obtenemos instalaciones (ya tu código existente)
  const instalaciones = await import('./calendarServiceInstalaciones').then(m => m.getCalendarEvents(params));

  // Luego contratos
  const contratos = await getContractEvents(params);

  // Luego facturas
  const facturas = await getInvoiceEvents(params);

  // Combinamos todos los eventos
  return [...instalaciones, ...contratos, ...facturas];
}

export default { getCalendarEvents };
