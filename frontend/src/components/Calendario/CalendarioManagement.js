import React, { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
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

      const allEvents = [];

      // 1️⃣ INSTALACIONES
      try {
        const resInstalaciones = await api.get('/instalaciones', { params: { limit: 10000 } });
        console.log('📦 Respuesta instalaciones:', resInstalaciones.data);
        
        const instalaciones = resInstalaciones?.data?.instalaciones || 
                             resInstalaciones?.data?.rows || 
                             resInstalaciones?.data || [];

        const instalacionEvents = instalaciones.map(it => {
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
            id: `instalacion-${id}`,
            title: titleParts.join(' — '),
            start,
            end: start,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: '#fff',
            extendedProps: {
              ...it,
              tipo_evento: 'Instalación',
              cliente_nombre: clienteNombre,
              instalador_nombre: instaladorNombre,
              hora_programada: hora,
              direccion_instalacion: it.direccion || it.direccion_instalacion,
              telefono_contacto: it.telefono || it.telefono_contacto,
            },
          };
        }).filter(Boolean);

        allEvents.push(...instalacionEvents);
        console.log('✅ Instalaciones cargadas:', instalacionEvents.length);
      } catch (err) {
        console.error('❌ Error cargando instalaciones:', err);
      }

      // 2️⃣ CONTRATOS - Fecha de finalización
      try {
        const resContratos = await api.get('/contratos', { params: { activo: 1 } });
        console.log('📦 Respuesta contratos:', resContratos.data);
        
        const contratos = resContratos?.data?.contratos || 
                         resContratos?.data?.rows || 
                         resContratos?.data || [];

        const contratosEvents = contratos
          .filter(c => c.fecha_fin || c.fecha_vencimiento_permanencia)
          .map(c => {
            const fechaFin = c.fecha_fin || c.fecha_vencimiento_permanencia;
            
            return {
              id: `contrato-${c.id}`,
              title: `📄 Vence Contrato #${c.numero_contrato || c.id}`,
              start: fechaFin.split('T')[0],
              allDay: true,
              backgroundColor: '#8B5CF6',
              borderColor: '#8B5CF6',
              textColor: '#fff',
              extendedProps: {
                ...c,
                tipo_evento: 'Vencimiento de Contrato',
                cliente_nombre: c.cliente?.nombre || c.cliente_nombre || 'Sin cliente',
                direccion_instalacion: c.direccion || c.direccion_instalacion || 'Sin dirección',
                telefono_contacto: c.telefono || c.telefono_contacto,
                estado: c.estado || 'Activo',
                valor: c.valor_total || c.valor_mensual || null,
              },
            };
          });

        allEvents.push(...contratosEvents);
        console.log('✅ Contratos cargados:', contratosEvents.length);
      } catch (err) {
        console.error('❌ Error cargando contratos:', err);
      }

      // 3️⃣ FACTURACIÓN ELECTRÓNICA - Fecha de emisión
      try {
        const resFacturas = await api.get('/facturas', { params: { estado: 'pending,pagada,vencida' } });
        console.log('📦 Respuesta facturas:', resFacturas.data);
        
        const facturas = resFacturas?.data?.facturas || 
                        resFacturas?.data?.rows || 
                        resFacturas?.data || [];

        const facturasEvents = facturas
          .filter(f => f.fecha_emision || f.fecha)
          .map(f => {
            const fechaEmision = f.fecha_emision || f.fecha;
            const estado = (f.estado || 'pending').toLowerCase();
            
            const color = estado === 'vencida' ? '#EF4444' 
              : estado === 'pagada' ? '#10B981' 
              : '#F59E0B';

            return {
              id: `factura-${f.id}`,
              title: `💳 Factura #${f.numero_factura || f.numero || f.id}`,
              start: fechaEmision.split('T')[0],
              allDay: true,
              backgroundColor: color,
              borderColor: color,
              textColor: '#fff',
              extendedProps: {
                ...f,
                tipo_evento: 'Factura Electrónica',
                cliente_nombre: f.cliente?.nombre || f.cliente_nombre || 'Sin cliente',
                estado: estado === 'pending' ? 'Pendiente' 
                  : estado === 'pagada' ? 'Pagada' 
                  : estado === 'vencida' ? 'Vencida' 
                  : estado,
                valor: f.total || f.valor_total || f.valor || 0,
              },
            };
          });

        allEvents.push(...facturasEvents);
        console.log('✅ Facturas cargadas:', facturasEvents.length);
      } catch (err) {
        console.error('❌ Error cargando facturas:', err);
      }

      setEvents(allEvents);
      console.log('✅ Total eventos combinados:', allEvents.length);
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
            Visualiza instalaciones, vencimientos de contratos y facturación electrónica.
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

      {/* Leyenda de colores */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Leyenda:</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2563EB' }}></div>
            <span>Instalación Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span>Completada / Pagada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
            <span>Vencimiento Contrato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span>Factura Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Cancelada / Vencida</span>
          </div>
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

      {/* Modal de detalles */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-sm text-gray-500">
                  {selected.start ? format(new Date(selected.start), "PPPP", { locale: require('date-fns/locale/es') }) : 'Fecha no disponible'}
                  {selected.end && selected.start !== selected.end && (
                    <> — hasta {format(new Date(selected.end), "PPPP", { locale: require('date-fns/locale/es') })}</>
                  )}
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              {selected.extended?.tipo_evento && (
                <div>
                  <strong>Tipo:</strong> {selected.extended.tipo_evento}
                </div>
              )}
              {selected.extended?.cliente_nombre && (
                <div>
                  <strong>Cliente:</strong> {selected.extended.cliente_nombre}
                </div>
              )}
              {selected.extended?.direccion_instalacion && (
                <div>
                  <strong>Dirección:</strong> {selected.extended.direccion_instalacion}
                </div>
              )}
              {selected.extended?.instalador_nombre && (
                <div>
                  <strong>Instalador:</strong> {selected.extended.instalador_nombre}
                </div>
              )}
              {selected.extended?.telefono_contacto && (
                <div>
                  <strong>Teléfono:</strong> {selected.extended.telefono_contacto}
                </div>
              )}
              {selected.extended?.hora_programada && (
                <div>
                  <strong>Hora:</strong> {selected.extended.hora_programada}
                </div>
              )}
              {selected.extended?.estado && (
                <div>
                  <strong>Estado:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    selected.extended.estado === 'Completada' || selected.extended.estado === 'Pagada' 
                      ? 'bg-green-100 text-green-800'
                      : selected.extended.estado === 'Cancelada' || selected.extended.estado === 'Vencida'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selected.extended.estado}
                  </span>
                </div>
              )}
              {selected.extended?.valor && (
                <div>
                  <strong>Valor:</strong> ${Number(selected.extended.valor).toLocaleString('es-CO')}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={closeModal} 
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioManagement;