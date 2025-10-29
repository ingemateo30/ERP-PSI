// frontend/src/components/Calendario/CalendarioManagement.js
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

      // =========================
      // INSTALACIONES
      // =========================
      let instalEvents = [];
      try {
        const res = await getCalendarEvents({ limit: 10000 });
        instalEvents = Array.isArray(res) ? res.map(i => ({
          id: `instalacion-${i.id}`,
          title: `Instalación: ${i.tipo_instalacion || 'No especificado'}`,
          start: i.fecha || new Date().toISOString(),
          allDay: true,
          backgroundColor: '#8B5CF6',
          borderColor: '#8B5CF6',
          textColor: '#fff',
          extendedProps: {
            cliente_nombre: i.cliente_nombre || 'No disponible',
            direccion_instalacion: i.direccion_instalacion || 'No disponible',
            instalador_nombre: i.instalador_nombre || 'No disponible',
            telefono_contacto: i.telefono_contacto || 'No disponible',
            tipo_instalacion: i.tipo_instalacion || 'No disponible',
            estado: i.estado || 'No disponible',
            ...i
          }
        })) : [];
      } catch (err) {
        console.warn('No se pudieron cargar instalaciones para el calendario', err);
      }

      // =========================
      // CONTRATOS ACTIVOS
      // =========================
      let contractEvents = [];
      try {
        const res = await api.get('/api/v1/contratos?activo=1');
        const contratos = Array.isArray(res?.data?.rows) ? res.data.rows : Array.isArray(res?.data) ? res.data : [];
        const hoy = new Date();
        contractEvents = contratos
          .filter(c => new Date(c.fecha_fin || c.fecha_vencimiento_permanencia || c.fecha_inicio) >= hoy)
          .map(c => ({
            id: `contrato-${c.id}`,
            title: `Contrato: ${c.numero_contrato || c.id}`,
            start: c.fecha_fin || c.fecha_vencimiento_permanencia || c.fecha_inicio,
            allDay: true,
            backgroundColor: '#3B82F6', // azul
            borderColor: '#3B82F6',
            textColor: '#fff',
            extendedProps: {
              cliente_nombre: c.cliente_nombre || 'No disponible',
              direccion_instalacion: c.direccion_instalacion || 'No disponible',
              instalador_nombre: c.instalador_nombre || 'No disponible',
              telefono_contacto: c.telefono_contacto || 'No disponible',
              tipo_instalacion: c.tipo_instalacion || 'No disponible',
              estado: c.estado || 'No disponible',
              ...c
            }
          }));
      } catch (err) {
        console.warn('No se pudieron cargar contratos para el calendario', err);
      }

      // =========================
      // FACTURAS ELECTRÓNICAS
      // =========================
      let invoiceEvents = [];
      try {
        const res = await api.get('/api/v1/facturas?estado=pending,pagada,vencida');
        const facturas = Array.isArray(res?.data?.rows) ? res.data.rows : Array.isArray(res?.data) ? res.data : [];
        invoiceEvents = facturas.map(f => ({
          id: `factura-${f.id}`,
          title: `Factura: ${f.numero_factura || f.id}`,
          start: f.fecha_emision || f.fecha || new Date().toISOString(),
          allDay: true,
          backgroundColor: '#F59E0B', // naranja
          borderColor: '#F59E0B',
          textColor: '#fff',
          extendedProps: {
            cliente_nombre: f.cliente_nombre || 'No disponible',
            direccion_instalacion: f.direccion_instalacion || 'No disponible',
            instalador_nombre: f.instalador_nombre || 'No disponible',
            telefono_contacto: f.telefono_contacto || 'No disponible',
            tipo_instalacion: f.tipo_instalacion || 'No disponible',
            estado: f.estado || 'No disponible',
            ...f
          }
        }));
      } catch (err) {
        console.warn('No se pudieron cargar facturas para el calendario', err);
      }

      // =========================
      // COMBINAR TODOS LOS EVENTOS
      // =========================
      setEvents([...instalEvents, ...contractEvents, ...invoiceEvents]);

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
      extended: ev.extendedProps || {}
    });
  };

  const closeModal = () => setSelected(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendario de Instalaciones</h1>
          <p className="text-sm text-gray-600 mt-1">
            Vista mensual de instalaciones, contratos y facturación electrónica.
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
              right: 'dayGridMonth'
            }}
            locale={esLocale}
            events={events}
            eventClick={handleEventClick}
            height="78vh"
            nowIndicator={true}
            eventDisplay="block"
            dayMaxEventRows={false}
            dayCellClassNames="fc-day-cell-scroll"
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
                  {selected.start ? format(new Date(selected.start), "PPPP 'a las' p") : 'Fecha no disponible'}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div><strong>Cliente:</strong> {selected.extended.cliente_nombre || 'No disponible'}</div>
              <div><strong>Dirección:</strong> {selected.extended.direccion_instalacion || 'No disponible'}</div>
              <div><strong>Instalador:</strong> {selected.extended.instalador_nombre || 'No disponible'}</div>
              <div><strong>Teléfono:</strong> {selected.extended.telefono_contacto || 'No disponible'}</div>
              <div><strong>Tipo:</strong> {selected.extended.tipo_instalacion || 'No disponible'}</div>
              <div><strong>Estado:</strong> {selected.extended.estado || 'No disponible'}</div>
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
