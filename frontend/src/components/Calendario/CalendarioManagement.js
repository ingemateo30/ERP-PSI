import React, { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import api from '../../services/apiService';
import { format, addDays, addMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import 'tailwindcss/tailwind.css';
import './CalendarioManagement.css';

const CalendarioManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  /**
   * Calcula los periodos de facturación según la lógica del sistema:
   * - Primera factura: desde fecha_inicio hasta día+30
   * - Segunda factura: desde día+30 hasta final del mes para nivelar
   * - Siguientes facturas: periodos completos del 1 al 30/31 de cada mes
   */
  const calcularPeriodosFacturacion = (contrato, numPeriodos = 6) => {
    const periodos = [];
    const fechaInicio = parseISO(contrato.fecha_inicio);
    const diaInicio = fechaInicio.getDate();
    
    // PRIMERA FACTURA: día inicio hasta día+29 (30 días)
    const finPrimerPeriodo = addDays(fechaInicio, 29);
    periodos.push({
      numero: 1,
      inicio: fechaInicio,
      fin: finPrimerPeriodo,
      tipo: 'Primera factura (30 días)',
      descripcion: `Primer mes de servicio desde día ${diaInicio}`,
    });

    // SEGUNDA FACTURA: día+30 hasta fin de mes (para nivelar)
    const inicioSegundoPeriodo = addDays(finPrimerPeriodo, 1);
    const mesSegundo = inicioSegundoPeriodo.getMonth();
    const anioSegundo = inicioSegundoPeriodo.getFullYear();
    const ultimoDiaMes = new Date(anioSegundo, mesSegundo + 1, 0).getDate();
    const finSegundoPeriodo = new Date(anioSegundo, mesSegundo, ultimoDiaMes);
    
    const diasSegundoPeriodo = Math.ceil((finSegundoPeriodo - inicioSegundoPeriodo) / (1000 * 60 * 60 * 24)) + 1;
    
    periodos.push({
      numero: 2,
      inicio: inicioSegundoPeriodo,
      fin: finSegundoPeriodo,
      tipo: 'Nivelación',
      descripcion: `Nivelación al fin de mes (${diasSegundoPeriodo} días)`,
    });

    // FACTURAS SIGUIENTES: del 1 al último día de cada mes
    let mesActual = finSegundoPeriodo.getMonth() + 1;
    let anioActual = finSegundoPeriodo.getFullYear();
    
    for (let i = 3; i <= numPeriodos; i++) {
      if (mesActual > 11) {
        mesActual = 0;
        anioActual++;
      }
      
      const inicioPeriodo = new Date(anioActual, mesActual, 1);
      const ultimoDia = new Date(anioActual, mesActual + 1, 0).getDate();
      const finPeriodo = new Date(anioActual, mesActual, ultimoDia);
      
      periodos.push({
        numero: i,
        inicio: inicioPeriodo,
        fin: finPeriodo,
        tipo: 'Mensual completa',
        descripcion: `Periodo mensual completo`,
      });
      
      mesActual++;
    }
    
    return periodos;
  };

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
            title: `🔧 ${titleParts.join(' — ')}`,
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

      // 2️⃣ CONTRATOS - Fecha de inicio y vencimiento
      try {
        const resContratos = await api.get('/contratos', { params: { activo: 1 } });
        console.log('📦 Respuesta contratos:', resContratos.data);
        
        const contratos = resContratos?.data?.contratos || 
                         resContratos?.data?.rows || 
                         resContratos?.data || [];

        // Evento de inicio de contrato
        contratos.forEach(c => {
          if (c.fecha_inicio) {
            allEvents.push({
              id: `contrato-inicio-${c.id}`,
              title: `📝 Inicio: ${c.cliente?.nombre || c.cliente_nombre || 'Cliente'}`,
              start: c.fecha_inicio.split('T')[0],
              allDay: true,
              backgroundColor: '#10B981',
              borderColor: '#10B981',
              textColor: '#fff',
              extendedProps: {
                tipo_evento: 'Inicio de Contrato',
                cliente_nombre: c.cliente?.nombre || c.cliente_nombre || 'Sin cliente',
                numero_contrato: c.numero_contrato || c.id,
                direccion_instalacion: c.direccion || c.direccion_instalacion,
                valor: c.valor_mensual || c.valor_total,
                telefono_contacto: c.telefono || c.telefono_contacto,
                descripcion: 'Generación automática: Contrato + Orden de Instalación + Primera Factura',
              },
            });
          }

          // Evento de vencimiento de contrato
          const fechaFin = c.fecha_fin || c.fecha_vencimiento_permanencia;
          if (fechaFin) {
            allEvents.push({
              id: `contrato-fin-${c.id}`,
              title: `📄 Vence: ${c.cliente?.nombre || c.cliente_nombre || 'Cliente'}`,
              start: fechaFin.split('T')[0],
              allDay: true,
              backgroundColor: '#8B5CF6',
              borderColor: '#8B5CF6',
              textColor: '#fff',
              extendedProps: {
                tipo_evento: 'Vencimiento de Contrato',
                cliente_nombre: c.cliente?.nombre || c.cliente_nombre || 'Sin cliente',
                numero_contrato: c.numero_contrato || c.id,
                direccion_instalacion: c.direccion || c.direccion_instalacion,
                telefono_contacto: c.telefono || c.telefono_contacto,
                estado: c.estado || 'Activo',
                valor: c.valor_total || c.valor_mensual || null,
              },
            });
          }

          // 🆕 GENERAR PERIODOS DE FACTURACIÓN AUTOMÁTICA
          if (c.fecha_inicio && c.estado !== 'inactivo') {
            try {
              const periodos = calcularPeriodosFacturacion(c, 6);
              
              periodos.forEach(periodo => {
                const hoy = new Date();
                // Solo mostrar periodos futuros o del mes actual
                if (periodo.fin >= hoy) {
                  allEvents.push({
                    id: `facturacion-${c.id}-periodo-${periodo.numero}`,
                    title: `💰 Factura ${periodo.numero}: ${c.cliente?.nombre || c.cliente_nombre || 'Cliente'}`,
                    start: periodo.fin.toISOString().split('T')[0],
                    allDay: true,
                    backgroundColor: periodo.numero === 1 ? '#EC4899' : periodo.numero === 2 ? '#F59E0B' : '#06B6D4',
                    borderColor: periodo.numero === 1 ? '#EC4899' : periodo.numero === 2 ? '#F59E0B' : '#06B6D4',
                    textColor: '#fff',
                    extendedProps: {
                      tipo_evento: 'Generación de Factura',
                      subtipo: periodo.tipo,
                      cliente_nombre: c.cliente?.nombre || c.cliente_nombre || 'Sin cliente',
                      numero_contrato: c.numero_contrato || c.id,
                      periodo_numero: periodo.numero,
                      fecha_inicio_periodo: format(periodo.inicio, 'dd/MM/yyyy'),
                      fecha_fin_periodo: format(periodo.fin, 'dd/MM/yyyy'),
                      dias_facturados: Math.ceil((periodo.fin - periodo.inicio) / (1000 * 60 * 60 * 24)) + 1,
                      valor: c.valor_mensual || c.valor_total,
                      direccion_instalacion: c.direccion || c.direccion_instalacion,
                      descripcion: periodo.descripcion,
                      plan: c.plan_nombre || 'Plan no especificado',
                      estrato: c.estrato || null,
                    },
                  });
                }
              });
            } catch (err) {
              console.warn('Error calculando periodos para contrato:', c.id, err);
            }
          }
        });

        console.log('✅ Contratos y periodos de facturación cargados');
      } catch (err) {
        console.error('❌ Error cargando contratos:', err);
      }

      // 3️⃣ FACTURAS ELECTRÓNICAS EMITIDAS
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
              title: `📄 Fact. #${f.numero_factura || f.numero || f.id}`,
              start: fechaEmision.split('T')[0],
              allDay: true,
              backgroundColor: color,
              borderColor: color,
              textColor: '#fff',
              extendedProps: {
                ...f,
                tipo_evento: 'Factura Emitida',
                cliente_nombre: f.cliente?.nombre || f.cliente_nombre || 'Sin cliente',
                estado: estado === 'pending' ? 'Pendiente' 
                  : estado === 'pagada' ? 'Pagada' 
                  : estado === 'vencida' ? 'Vencida' 
                  : estado,
                valor: f.total || f.valor_total || f.valor || 0,
                periodo_facturado: f.periodo_inicio && f.periodo_fin 
                  ? `${format(parseISO(f.periodo_inicio), 'dd/MM/yyyy')} - ${format(parseISO(f.periodo_fin), 'dd/MM/yyyy')}`
                  : null,
              },
            };
          });

        allEvents.push(...facturasEvents);
        console.log('✅ Facturas emitidas cargadas:', facturasEvents.length);
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
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendario de Gestión</h1>
          <p className="text-sm text-gray-600 mt-1">
            Instalaciones, contratos, facturación automática y pagos
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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Leyenda de Eventos:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span>Inicio Contrato / Pagada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2563EB' }}></div>
            <span>Instalación Programada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
            <span>Vence Contrato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EC4899' }}></div>
            <span>1ª Factura (30 días)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span>2ª Factura (nivelación)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06B6D4' }}></div>
            <span>Factura Mensual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Vencida / Cancelada</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Sistema de Facturación:</strong> 1ª factura (30 días desde inicio), 
            2ª factura (nivelación hasta fin de mes), siguientes facturas (periodos completos del 1 al 30/31)
          </p>
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{selected.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selected.start ? format(new Date(selected.start), "PPPP", { locale: es }) : 'Fecha no disponible'}
                </p>
              </div>
              <button 
                onClick={closeModal} 
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Tipo de evento */}
              {selected.extended?.tipo_evento && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Tipo de Evento:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.tipo_evento}</span>
                </div>
              )}

              {/* Subtipo para facturación */}
              {selected.extended?.subtipo && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Subtipo:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.subtipo}</span>
                </div>
              )}

              {/* Cliente */}
              {selected.extended?.cliente_nombre && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Cliente:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.cliente_nombre}</span>
                </div>
              )}

              {/* Número de contrato */}
              {selected.extended?.numero_contrato && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Contrato:</span>
                  <span className="text-gray-900 flex-1">#{selected.extended.numero_contrato}</span>
                </div>
              )}

              {/* Periodo de facturación */}
              {selected.extended?.periodo_numero && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Periodo:</span>
                  <span className="text-gray-900 flex-1">
                    Factura #{selected.extended.periodo_numero}
                  </span>
                </div>
              )}

              {/* Fechas del periodo */}
              {selected.extended?.fecha_inicio_periodo && selected.extended?.fecha_fin_periodo && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Periodo Facturado:</span>
                  <span className="text-gray-900 flex-1">
                    {selected.extended.fecha_inicio_periodo} al {selected.extended.fecha_fin_periodo}
                    {selected.extended.dias_facturados && (
                      <span className="text-gray-500 ml-2">({selected.extended.dias_facturados} días)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Periodo facturado para facturas emitidas */}
              {selected.extended?.periodo_facturado && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Periodo:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.periodo_facturado}</span>
                </div>
              )}

              {/* Plan */}
              {selected.extended?.plan && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Plan:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.plan}</span>
                </div>
              )}

              {/* Estrato (para cálculo de IVA) */}
              {selected.extended?.estrato && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Estrato:</span>
                  <span className="text-gray-900 flex-1">
                    {selected.extended.estrato}
                    {[1,2,3].includes(selected.extended.estrato) && (
                      <span className="ml-2 text-green-600 text-xs">(Sin IVA en Internet)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Descripción */}
              {selected.extended?.descripcion && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Descripción:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.descripcion}</span>
                </div>
              )}

              {/* Dirección */}
              {selected.extended?.direccion_instalacion && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Dirección:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.direccion_instalacion}</span>
                </div>
              )}

              {/* Instalador */}
              {selected.extended?.instalador_nombre && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Instalador:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.instalador_nombre}</span>
                </div>
              )}

              {/* Teléfono */}
              {selected.extended?.telefono_contacto && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Teléfono:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.telefono_contacto}</span>
                </div>
              )}

              {/* Hora */}
              {selected.extended?.hora_programada && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Hora:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.hora_programada}</span>
                </div>
              )}

              {/* Estado */}
              {selected.extended?.estado && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Estado:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selected.extended.estado === 'Completada' || selected.extended.estado === 'Pagada' || selected.extended.estado === 'Activo'
                      ? 'bg-green-100 text-green-800'
                      : selected.extended.estado === 'Cancelada' || selected.extended.estado === 'Vencida'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selected.extended.estado}
                  </span>
                </div>
              )}

              {/* Valor */}
              {selected.extended?.valor && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Valor:</span>
                  <span className="text-gray-900 flex-1 font-semibold">
                    ${Number(selected.extended.valor).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
            </div>

            {/* Nota informativa para facturación */}
            {selected.extended?.tipo_evento === 'Generación de Factura' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <strong>💡 Proceso Automático:</strong> El sistema generará y enviará esta factura 
                a la DIAN automáticamente en esta fecha. Se enviará notificación al cliente.
              </div>
            )}

            {selected.extended?.tipo_evento === 'Inicio de Contrato' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                <strong>✅ Generación Automática:</strong> Al crear el cliente se generan: Contrato, 
                Orden de Instalación y Primera Factura (incluye cargo de instalación $42.016 + IVA).
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button 
                onClick={closeModal} 
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-medium"
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