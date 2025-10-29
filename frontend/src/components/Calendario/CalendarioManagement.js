// frontend/src/components/Calendario/CalendarioManagement.js
import React, { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { getCalendarEvents } from '../../services/calendarService';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

const CalendarioManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // evento seleccionado para modal

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getCalendarEvents({ limit: 10000 }); // pide muchos por si acaso
      setEvents(items);
    } catch (err) {
      console.error('Error cargando eventos del calendario', err);
      setError('No se pudieron cargar los eventos del calendario. Revisa el backend o la conexión.');
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
      extended: ev.extendedProps || {},
    });
  };

  const closeModal = () => setSelected(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendario de Instalaciones</h1>
          <p className="text-sm text-gray-600 mt-1">
            Vista mensual de instalaciones programadas (solo lectura). Haz click en un evento para ver detalles.
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
  dayMaxEventRows={false} // Mostrar todos los eventos con scroll si hay muchos
/>

        )}
      </div>

      {/* Modal simple de detalles (inline, estilado con Tailwind) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-sm text-gray-500">
                  {selected.start ? format(new Date(selected.start), "PPPP 'a las' p") : 'Fecha no disponible'}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div><strong>Cliente:</strong> {selected.extended.cliente_nombre || selected.extended.cliente_id || 'N/A'}</div>
              <div><strong>Dirección:</strong> {selected.extended.direccion_instalacion || 'N/A'}</div>
              <div><strong>Instalador:</strong> {selected.extended.instalador_nombre || selected.extended.instalador || 'No asignado'}</div>
              <div><strong>Teléfono:</strong> {selected.extended.telefono_contacto || 'N/A'}</div>
              <div><strong>Tipo:</strong> {selected.extended.tipo_instalacion || 'N/A'}</div>
              <div><strong>Estado:</strong> {selected.extended.estado || 'N/A'}</div>
              {selected.extended.observaciones && (
                <div>
                  <strong>Observaciones:</strong>
                  <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{selected.extended.observaciones}</div>
                </div>
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
