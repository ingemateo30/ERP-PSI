import React, { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { getCalendarEvents } from '../../services/calendarService';
import api from '../../services/apiService';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import 'tailwindcss/tailwind.css';
import './CalendarioManagement.css';

const CalendarioManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando eventos del calendario...');

      // 1️⃣ Cargar instalaciones, contratos y facturas desde calendarService
      const baseEvents = await getCalendarEvents({ limit: 10000 });
      console.log('📌 Eventos base recibidos:', baseEvents);

      // 2️⃣ Verificar si los contratos activos traen correctamente las fechas
      let contractEvents = [];
      try {
        const res = await api.get('/contratos?activo=1');
        const contratos = Array.isArray(res?.data?.rows)
          ? res.data.rows
          : Array.isArray(res?.data)
          ? res.data
          : [];
        console.log('📌 Contratos recibidos:', contratos);

        contractEvents = contratos.map(c => {
          const startDate = c.fecha_inicio || new Date().toISOString();
          const endDate = c.fecha_fin || c.fecha_vencimiento_permanencia || startDate;

          return {
            id: `contrato-${c.id}`,
            title: `Contrato #${c.numero_contrato || c.id}`,
            start: startDate,
            end: endDate,
            allDay: true,
            backgroundColor: '#8B5CF6', // morado
            borderColor: '#8B5CF6',
            textColor: '#fff',
            extendedProps: {
              ...c,
              tipo_evento: 'Contrato',
              cliente_nombre: c.cliente?.nombre || c.cliente_nombre || 'Sin cliente',
              estado: c.estado || 'Activo',
            },
          };
        });
      } catch (err) {
        console.warn('❌ Error cargando contratos:', err);
      }

      // 3️⃣ Cargar facturas
      let invoiceEvents = [];
      try {
        const res = await api.get('/facturas?estado=pending,pagada,vencida');
        const facturas = Array.isArray(res?.data?.rows)
          ? res.data.rows
          : Array.isArray(res?.data)
          ? res.data
          : [];
        console.log('📌 Facturas recibidas:', facturas);

        invoiceEvents = facturas.map(f => {
          const invoiceDate = f.fecha_emision || f.fecha || new Date().toISOString();

          return {
            id: `factura-${f.id}`,
            title: `Factura #${f.numero_factura || f.id}`,
            start: invoiceDate,
            allDay: true,
            backgroundColor: '#F59E0B', // naranja
            borderColor: '#F59E0B',
            textColor: '#fff',
            extendedProps: {
              ...f,
              tipo_evento: 'Factura',
              estado: f.estado || 'Pendiente',
              cliente_nombre: f.cliente?.nombre || f.cliente_nombre || 'Sin cliente',
            },
          };
        });
      } catch (err) {
        console.warn('❌ Error cargando facturas:', err);
      }

      // 4️⃣ Unir todos los eventos (instalaciones, contratos, facturas)
      const combinedEvents = [...baseEvents, ...contractEvents, ...invoiceEvents];
      setEvents(combinedEvents);
      console.log('✅ Eventos combinados cargados:', combinedEvents);
    } catch (err) {
      console.error('❌ Error general cargando el calendario:', err);
      setError('No se pudieron cargar los eventos. Revisa el backend o la conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEventClick = (clickInfo) => {
    const ev = clickInfo.event;
    setSelected({
      id: ev.id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      extended: ev.extendedProps || {},
    });
  };

  const closeModal = () => setSelected(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendario General</h1>
          <p className="text-sm text-gray-600 mt-1">
            Instalaciones, contratos y facturación electrónica en una sola vista.
          </p>
        </div>
        <div>
          <button
            onClick={load}
            className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <div>{error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
            <div className="text-gray-600">Cargando calendario...</div>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth',
            }}
            locale={esLocale}
            events={events}
            eventClick={handleEventClick}
            height="78vh"
            nowIndicator={true}
            eventDisplay="block"
            dayMaxEventRows={true}
          />
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-sm text-gray-500">
                  {selected.start ? format(new Date(selected.start), "PPPP") : 'Fecha no disponible'}
                  {selected.end && selected.start !== selected.end && (
                    <> — hasta {format(new Date(selected.end), "PPPP")}</>
                  )}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              {selected.extended?.tipo_evento && (
                <div><strong>Tipo:</strong> {selected.extended.tipo_evento}</div>
              )}
              {selected.extended?.cliente_nombre && (
                <div><strong>Cliente:</strong> {selected.extended.cliente_nombre}</div>
              )}
              {selected.extended?.direccion_instalacion && (
                <div><strong>Dirección:</strong> {selected.extended.direccion_instalacion}</div>
              )}
              {selected.extended?.instalador_nombre && (
                <div><strong>Instalador:</strong> {selected.extended.instalador_nombre}</div>
              )}
              {selected.extended?.telefono_contacto && (
                <div><strong>Teléfono:</strong> {selected.extended.telefono_contacto}</div>
              )}
              {selected.extended?.estado && (
                <div><strong>Estado:</strong> {selected.extended.estado}</div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded mr-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioManagement;
