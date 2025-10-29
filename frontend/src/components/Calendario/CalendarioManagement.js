// frontend/src/services/calendarService.js
import api from './apiService';
import { formatISO, addMonths, isAfter, parseISO } from 'date-fns';
import { getInstalacionesEvents } from './calendarServiceInstalaciones'; // Tu servicio original de instalaciones

export async function getCalendarEvents(params = {}) {
  // 1️⃣ Eventos de instalaciones: dejamos exactamente como estaba
  const instalaciones = await getInstalacionesEvents(params);

  // 2️⃣ Eventos de contratos y facturación recurrente
  let contratos = [];
  try {
    const res = await api.get('/contratos?activo=1');
    const items = Array.isArray(res.data) ? res.data : res.data?.contratos || [];

    contratos = items.flatMap((c) => {
      if (!c.fecha_fin) return [];

      const fechaFin = parseISO(c.fecha_fin);
      const start = formatISO(fechaFin);

      return [
        {
          id: `contrato-${c.id}`,
          title: `Contrato ${c.numero_contrato}`,
          start,
          end: start,
          allDay: true,
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
          textColor: '#fff',
          extendedProps: {
            tipo: 'contrato',
            cliente_id: c.cliente_id,
            estado: c.estado,
            fecha_fin: c.fecha_fin,
          },
        },
        ...generateMonthlyInvoices(c),
      ];
    });
  } catch (err) {
    console.warn('No se pudieron cargar contratos para el calendario', err);
  }

  // 3️⃣ Eventos de facturas sueltas
  let facturas = [];
  try {
    const res = await api.get('/facturas?estado=pendiente,pagada,vencida');
    const items = Array.isArray(res.data) ? res.data : res.data?.facturas || [];

    facturas = items.map((f) => {
      if (!f.fecha_vencimiento) return null;
      const start = formatISO(parseISO(f.fecha_vencimiento));

      let color = '#2563EB';
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
  }

  return [...instalaciones, ...contratos, ...facturas];
}

// Genera facturación recurrente mensual según el contrato
function generateMonthlyInvoices(contrato) {
  const { fecha_inicio, fecha_fin, numero_contrato, cliente_id } = contrato;
  if (!fecha_inicio || !fecha_fin) return [];

  const invoices = [];
  let current = parseISO(fecha_inicio);
  const end = parseISO(fecha_fin);

  while (isAfter(end, current) || +current === +end) {
    invoices.push({
      id: `facturacion-${numero_contrato}-${formatISO(current, { representation: 'date' })}`,
      title: `Facturación ${numero_contrato}`,
      start: formatISO(current),
      end: formatISO(current),
      allDay: true,
      backgroundColor: '#F59E0B',
      borderColor: '#F59E0B',
      textColor: '#fff',
      extendedProps: {
        tipo: 'facturacion_recurrente',
        cliente_id,
        contrato_id: contrato.id,
      },
    });
    current = addMonths(current, 1);
  }

  return invoices;
}

export default { getCalendarEvents };
