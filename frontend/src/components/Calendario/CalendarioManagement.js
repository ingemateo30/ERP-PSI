import React, { useEffect, useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import api from '../../services/apiService';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Bell, TrendingUp, Filter, X } from 'lucide-react';
import 'tailwindcss/tailwind.css';
import './CalendarioManagement.css';
import { useAuth } from '../../contexts/AuthContext';
import { instalacionesService } from '../../services/instalacionesService';
const CalendarioManagement = () => {
    const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo: 'todos', // todos, instalaciones, facturas, contratos
    estado: 'todos', // todos, pendiente, pagada, vencida
  });

  // Calcular alertas automáticamente
  const alertas = useMemo(() => {
    const hoy = new Date();
    const en3Dias = addDays(hoy, 3);
    const en7Dias = addDays(hoy, 7);

    const facturasProximasVencer = events.filter(e => {
      if (!e.id.startsWith('factura-')) return false;
      if (!e.extendedProps?.fecha_vencimiento) return false;
      if (e.extendedProps?.estado_display === 'Pagada') return false;
      
      const fechaVenc = parseISO(e.extendedProps.fecha_vencimiento);
      return fechaVenc >= hoy && fechaVenc <= en3Dias;
    });

    const contratosProximosVencer = events.filter(e => {
      if (!e.id.startsWith('contrato-fin-')) return false;
      if (!e.start) return false;
      
      const fechaFin = new Date(e.start);
      return fechaFin >= hoy && fechaFin <= en7Dias;
    });

    const instalacionesHoy = events.filter(e => {
      if (!e.id.startsWith('instalacion-')) return false;
      if (!e.start) return false;
      
      const fechaInst = new Date(e.start);
      return fechaInst.toDateString() === hoy.toDateString();
    });

    const facturasVencidas = events.filter(e => 
      e.id.startsWith('factura-') && 
      (e.extendedProps?.estado_display === 'Vencida' || e.extendedProps?.dias_vencimiento > 0)
    );

    return {
      facturasProximasVencer,
      contratosProximosVencer,
      instalacionesHoy,
      facturasVencidas,
      total: facturasProximasVencer.length + contratosProximosVencer.length + facturasVencidas.length
    };
  }, [events]);

  // Calcular reportes
  const reportes = useMemo(() => {
    const facturas = events.filter(e => e.id.startsWith('factura-'));
    
    const totalFacturado = facturas.reduce((sum, f) => 
      sum + (parseFloat(f.extendedProps?.valor_total) || 0), 0
    );

    const totalPagado = facturas
      .filter(f => f.extendedProps?.estado_display === 'Pagada')
      .reduce((sum, f) => sum + (parseFloat(f.extendedProps?.valor_total) || 0), 0);

    const totalPendiente = facturas
      .filter(f => f.extendedProps?.estado_display === 'Pendiente')
      .reduce((sum, f) => sum + (parseFloat(f.extendedProps?.valor_total) || 0), 0);

    const totalVencido = facturas
      .filter(f => f.extendedProps?.estado_display === 'Vencida' || f.extendedProps?.dias_vencimiento > 0)
      .reduce((sum, f) => sum + (parseFloat(f.extendedProps?.valor_total) || 0), 0);

    const tasaPago = facturas.length > 0 
      ? ((facturas.filter(f => f.extendedProps?.estado_display === 'Pagada').length / facturas.length) * 100).toFixed(1)
      : 0;

    return {
      totalFacturas: facturas.length,
      totalFacturado,
      totalPagado,
      totalPendiente,
      totalVencido,
      tasaPago,
      porEstado: {
        pagadas: facturas.filter(f => f.extendedProps?.estado_display === 'Pagada').length,
        pendientes: facturas.filter(f => f.extendedProps?.estado_display === 'Pendiente').length,
        vencidas: facturas.filter(f => f.extendedProps?.estado_display === 'Vencida' || f.extendedProps?.dias_vencimiento > 0).length,
      }
    };
  }, [events]);

  // Filtrar eventos según filtros activos
  const eventosFiltrados = useMemo(() => {
    return events.filter(event => {
      // Filtro por tipo
      if (filters.tipo !== 'todos') {
        if (filters.tipo === 'instalaciones' && !event.id.startsWith('instalacion-')) return false;
        if (filters.tipo === 'facturas' && !event.id.startsWith('factura-')) return false;
        if (filters.tipo === 'contratos' && !event.id.startsWith('contrato-')) return false;
      }

      // Filtro por estado (solo para facturas)
      if (filters.estado !== 'todos' && event.id.startsWith('factura-')) {
        const estado = event.extendedProps?.estado_display?.toLowerCase();
        if (filters.estado === 'pendiente' && estado !== 'pendiente') return false;
        if (filters.estado === 'pagada' && estado !== 'pagada') return false;
        if (filters.estado === 'vencida' && estado !== 'vencida') return false;
      }

      return true;
    });
  }, [events, filters]);

const load = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    console.log('🔄 Cargando eventos del calendario desde el backend...');

    const allEvents = [];

    // 1️⃣ INSTALACIONES
    try {
      let instalaciones = [];
      
      if (user?.rol === 'instalador') {
  console.log('👷 Instalador detectado, cargando solo mis instalaciones');
  const apiResponse = await instalacionesService.getMisInstalaciones();
  instalaciones = apiResponse.instalaciones || [];
} else {
        // Admin/Supervisor: todas las instalaciones
        const resInstalaciones = await api.get('/instalaciones', { params: { limit: 10000 } });
        instalaciones = resInstalaciones?.data?.instalaciones || 
                       resInstalaciones?.data?.rows || 
                       resInstalaciones?.data || [];
      }
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

      // 2️⃣ CONTRATOS
      if (user?.rol !== 'instalador') {
      try {
        const resContratos = await api.get('/contratos', { params: { activo: 1 } });
        const contratos = resContratos?.data?.contratos || 
                         resContratos?.data?.rows || 
                         resContratos?.data || [];

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
                valor_mensual: c.valor_mensual || c.valor_total,
                telefono_contacto: c.telefono || c.telefono_contacto,
                descripcion: 'Se genera automáticamente: Contrato + Orden de Instalación + Primera Factura',
                plan_nombre: c.plan_nombre,
                estrato: c.estrato,
              },
            });
          }

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
        });

        console.log('✅ Contratos cargados');
 } catch (err) {
    console.error('❌ Error cargando contratos:', err);
  }
}
      // 3️⃣ FACTURAS ELECTRÓNICAS
      if (user?.rol !== 'instalador') {
      try {
        const hoy = new Date();
        const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
        const en3Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0);

        const resFacturas = await api.get('/facturas', { 
          params: { 
            fecha_desde: hace6Meses.toISOString().split('T')[0],
            fecha_hasta: en3Meses.toISOString().split('T')[0],
            limit: 1000
          } 
        });
        
        const facturas = resFacturas?.data?.facturas || 
                        resFacturas?.data?.rows || 
                        resFacturas?.data?.data?.facturas ||
                        resFacturas?.data || [];

        const facturasEvents = facturas
          .filter(f => f.fecha_emision || f.fecha)
          .map(f => {
            const fechaEmision = f.fecha_emision || f.fecha;
            const estado = (f.estado || 'pending').toLowerCase();
            
            let color, icono, tipoEvento;
            
            if (estado === 'pagada') {
              color = '#10B981';
              icono = '✅';
              tipoEvento = 'Factura Pagada';
            } else if (estado === 'vencida' || f.dias_vencimiento > 0) {
              color = '#EF4444';
              icono = '⚠️';
              tipoEvento = 'Factura Vencida';
            } else if (estado === 'anulada') {
              color = '#6B7280';
              icono = '🚫';
              tipoEvento = 'Factura Anulada';
            } else {
              color = '#F59E0B';
              icono = '💳';
              tipoEvento = 'Factura Pendiente';
            }

            return {
              id: `factura-${f.id}`,
              title: `${icono} ${f.numero_factura || `#${f.id}`}`,
              start: fechaEmision.split('T')[0],
              allDay: true,
              backgroundColor: color,
              borderColor: color,
              textColor: '#fff',
              extendedProps: {
                ...f,
                tipo_evento: tipoEvento,
                cliente_nombre: f.nombre_cliente || f.cliente?.nombre || f.cliente_nombre || 'Sin cliente',
                numero_factura: f.numero_factura || `FAC-${f.id}`,
                periodo_facturacion: f.periodo_facturacion,
                fecha_desde: f.fecha_desde,
                fecha_hasta: f.fecha_hasta,
                fecha_vencimiento: f.fecha_vencimiento,
                fecha_pago: f.fecha_pago,
                estado_display: estado === 'pending' ? 'Pendiente' 
                  : estado === 'pagada' ? 'Pagada' 
                  : estado === 'vencida' ? 'Vencida'
                  : estado === 'anulada' ? 'Anulada'
                  : estado,
                valor_total: f.total || f.valor_total || f.valor || 0,
                subtotal: f.subtotal || 0,
                iva: f.iva || 0,
                metodo_pago: f.metodo_pago,
                dias_vencimiento: f.dias_vencimiento || 0,
              },
            };
          });

        allEvents.push(...facturasEvents);
        console.log('✅ Facturas cargadas:', facturasEvents.length);
       } catch (err) {
    console.error('❌ Error cargando facturas:', err);
  }
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
      {/* Header con botones de acción */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 Calendario de Gestión ISP</h1>
          <p className="text-sm text-gray-600 mt-1">
            Instalaciones, contratos y facturación electrónica en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`relative px-3 py-2 border rounded-md text-sm transition ${
              showAlerts ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-1" />
            Alertas
            {alertas.total > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alertas.total}
              </span>
            )}
          </button>
          {user?.rol !== 'instalador' && (
          <button
            onClick={() => setShowReports(!showReports)}
            className={`px-3 py-2 border rounded-md text-sm transition ${
              showReports ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Reportes
          </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-md text-sm transition ${
              showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-1" />
            Filtros
          </button>
          <button
            onClick={load}
            className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

{/* Panel de Alertas */}
{showAlerts && (
  <div className="mb-4 bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold text-gray-900">🔔 Alertas y Notificaciones</h3>
      <button onClick={() => setShowAlerts(false)} className="text-gray-400 hover:text-gray-600">
        <X className="w-5 h-5" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Instalaciones hoy */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-blue-800">🔧 Instalaciones Hoy</h4>
          <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded">
            {alertas.instalacionesHoy.length}
          </span>
        </div>
        {alertas.instalacionesHoy.length > 0 ? (
          <ul className="text-xs space-y-1">
            {alertas.instalacionesHoy.map(i => (
              <li key={i.id} className="text-blue-700">
                • {i.extendedProps?.cliente_nombre} - {i.extendedProps?.hora_programada}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-blue-600">No hay instalaciones programadas hoy</p>
        )}
      </div>

      {/* Solo admin/supervisor ven alertas financieras */}
      {user?.rol !== 'instalador' && (
        <>
          {/* Facturas próximas a vencer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-yellow-800">⚠️ Vencen en 3 días</h4>
              <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                {alertas.facturasProximasVencer.length}
              </span>
            </div>
            {alertas.facturasProximasVencer.length > 0 ? (
              <ul className="text-xs space-y-1">
                {alertas.facturasProximasVencer.slice(0, 3).map(f => (
                  <li key={f.id} className="text-yellow-700">
                    • {f.extendedProps?.numero_factura} - {f.extendedProps?.cliente_nombre}
                    <span className="ml-2 text-yellow-600">
                      (Vence: {format(parseISO(f.extendedProps.fecha_vencimiento), 'dd/MM/yyyy')})
                    </span>
                  </li>
                ))}
                {alertas.facturasProximasVencer.length > 3 && (
                  <li className="text-yellow-600 font-semibold">
                    ... y {alertas.facturasProximasVencer.length - 3} más
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-yellow-600">No hay facturas próximas a vencer</p>
            )}
          </div>

          {/* Facturas vencidas */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-red-800">🚨 Facturas Vencidas</h4>
              <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                {alertas.facturasVencidas.length}
              </span>
            </div>
            {alertas.facturasVencidas.length > 0 ? (
              <ul className="text-xs space-y-1">
                {alertas.facturasVencidas.slice(0, 3).map(f => (
                  <li key={f.id} className="text-red-700">
                    • {f.extendedProps?.numero_factura} - {f.extendedProps?.cliente_nombre}
                    <span className="ml-2 text-red-600">
                      ({f.extendedProps?.dias_vencimiento} días)
                    </span>
                  </li>
                ))}
                {alertas.facturasVencidas.length > 3 && (
                  <li className="text-red-600 font-semibold">
                    ... y {alertas.facturasVencidas.length - 3} más
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-red-600">No hay facturas vencidas 🎉</p>
            )}
          </div>

          {/* Contratos próximos a vencer */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-purple-800">📄 Contratos (7 días)</h4>
              <span className="bg-purple-200 text-purple-800 text-xs font-bold px-2 py-1 rounded">
                {alertas.contratosProximosVencer.length}
              </span>
            </div>
            {alertas.contratosProximosVencer.length > 0 ? (
              <ul className="text-xs space-y-1">
                {alertas.contratosProximosVencer.map(c => (
                  <li key={c.id} className="text-purple-700">
                    • {c.extendedProps?.cliente_nombre} - Contrato #{c.extendedProps?.numero_contrato}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-purple-600">No hay contratos próximos a vencer</p>
            )}
          </div>
        </>
      )}
    </div>
  </div>
)}
      {/* Panel de Reportes */}
      {showReports && (
        <div className="mb-4 bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">📊 Reportes de Facturación</h3>
            <button onClick={() => setShowReports(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-semibold uppercase">Total Facturado</p>
              <p className="text-2xl font-bold text-blue-700">
                ${reportes.totalFacturado.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-blue-500">{reportes.totalFacturas} facturas</p>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-semibold uppercase">Pagado</p>
              <p className="text-2xl font-bold text-green-700">
                ${reportes.totalPagado.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-green-500">{reportes.porEstado.pagadas} facturas</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-xs text-yellow-600 font-semibold uppercase">Pendiente</p>
              <p className="text-2xl font-bold text-yellow-700">
                ${reportes.totalPendiente.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-yellow-500">{reportes.porEstado.pendientes} facturas</p>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600 font-semibold uppercase">Vencido</p>
              <p className="text-2xl font-bold text-red-700">
                ${reportes.totalVencido.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-red-500">{reportes.porEstado.vencidas} facturas</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <p className="text-sm text-gray-600">Tasa de Pago</p>
              <p className="text-3xl font-bold text-gray-900">{reportes.tasaPago}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Pagadas vs Total</p>
              <p className="text-sm text-gray-700">
                {reportes.porEstado.pagadas} de {reportes.totalFacturas}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="mb-4 bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">🔍 Filtros</h3>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todos">Todos los eventos</option>
                <option value="instalaciones">Solo Instalaciones</option>
                <option value="facturas">Solo Facturas</option>
                <option value="contratos">Solo Contratos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Facturas</label>
              <select
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagada">Pagadas</option>
                <option value="vencida">Vencidas</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Mostrando {eventosFiltrados.length} de {events.length} eventos
            </p>
            <button
              onClick={() => setFilters({ tipo: 'todos', estado: 'todos' })}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}
{/* Estadísticas rápidas */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{eventosFiltrados.length}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Instalaciones</p>
              <p className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.id.startsWith('instalacion-')).length}
              </p>
            </div>
            <div className="text-3xl">🔧</div>
          </div>
        </div>

        {user?.rol !== 'instalador' && (
          <>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Facturas</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {events.filter(e => e.id.startsWith('factura-')).length}
                  </p>
                </div>
                <div className="text-3xl">💳</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Contratos</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {events.filter(e => e.id.startsWith('contrato-')).length}
                  </p>
                </div>
                <div className="text-3xl">📄</div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Leyenda de colores */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🎨 Códigos de Color:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span>Pagada / Inicio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2563EB' }}></div>
            <span>Instalación</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Vencida</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
            <span>Vence Contrato</span>
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
            events={eventosFiltrados}
            eventClick={handleEventClick}
            height="78vh"
            nowIndicator={true}
            eventDisplay="block"
            dayMaxEventRows={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false
            }}
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
              {selected.extended?.tipo_evento && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Tipo:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.tipo_evento}</span>
                </div>
              )}

              {selected.extended?.cliente_nombre && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Cliente:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.cliente_nombre}</span>
                </div>
              )}

              {selected.extended?.numero_factura && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Número:</span>
                  <span className="text-gray-900 flex-1 font-mono">{selected.extended.numero_factura}</span>
                </div>
              )}

              {selected.extended?.numero_contrato && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Contrato:</span>
                  <span className="text-gray-900 flex-1">#{selected.extended.numero_contrato}</span>
                </div>
              )}

              {selected.extended?.periodo_facturacion && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Periodo:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.periodo_facturacion}</span>
                </div>
              )}

              {selected.extended?.fecha_desde && selected.extended?.fecha_hasta && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Rango:</span>
                  <span className="text-gray-900 flex-1">
                    {format(parseISO(selected.extended.fecha_desde), 'dd/MM/yyyy')} al{' '}
                    {format(parseISO(selected.extended.fecha_hasta), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}

              {selected.extended?.fecha_vencimiento && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Vencimiento:</span>
                  <span className="text-gray-900 flex-1">
                    {format(parseISO(selected.extended.fecha_vencimiento), 'dd/MM/yyyy')}
                    {selected.extended.dias_vencimiento > 0 && (
                      <span className="ml-2 text-red-600 font-semibold">
                        ({selected.extended.dias_vencimiento} días vencida)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {selected.extended?.fecha_pago && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Fecha Pago:</span>
                  <span className="text-gray-900 flex-1">
                    {format(parseISO(selected.extended.fecha_pago), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}

              {selected.extended?.metodo_pago && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Método Pago:</span>
                  <span className="text-gray-900 flex-1 capitalize">{selected.extended.metodo_pago}</span>
                </div>
              )}

              {selected.extended?.plan_nombre && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Plan:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.plan_nombre}</span>
                </div>
              )}

              {selected.extended?.estrato && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Estrato:</span>
                  <span className="text-gray-900 flex-1">
                    {selected.extended.estrato}
                    {[1,2,3].includes(parseInt(selected.extended.estrato)) && (
                      <span className="ml-2 text-green-600 text-xs">(Sin IVA en Internet)</span>
                    )}
                  </span>
                </div>
              )}

              {selected.extended?.descripcion && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Descripción:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.descripcion}</span>
                </div>
              )}

              {selected.extended?.direccion_instalacion && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Dirección:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.direccion_instalacion}</span>
                </div>
              )}

              {selected.extended?.instalador_nombre && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Instalador:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.instalador_nombre}</span>
                </div>
              )}

              {selected.extended?.telefono_contacto && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Teléfono:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.telefono_contacto}</span>
                </div>
              )}

              {selected.extended?.hora_programada && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Hora:</span>
                  <span className="text-gray-900 flex-1">{selected.extended.hora_programada}</span>
                </div>
              )}

              {selected.extended?.estado_display && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 w-40">Estado:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selected.extended.estado_display === 'Pagada' || selected.extended.estado_display === 'Completada' || selected.extended.estado_display === 'Activo'
                      ? 'bg-green-100 text-green-800'
                      : selected.extended.estado_display === 'Vencida' || selected.extended.estado_display === 'Cancelada' || selected.extended.estado_display === 'Anulada'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selected.extended.estado_display}
                  </span>
                </div>
              )}

              {(selected.extended?.valor_total || selected.extended?.valor_mensual || selected.extended?.valor) && (
                <div className="pt-3 border-t border-gray-200">
                  {selected.extended.subtotal > 0 && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">${Number(selected.extended.subtotal).toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {selected.extended.iva > 0 && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">IVA:</span>
                      <span className="text-gray-900">${Number(selected.extended.iva).toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t border-gray-300">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-gray-900">
                      ${Number(selected.extended.valor_total || selected.extended.valor_mensual || selected.extended.valor).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}
            </div>

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