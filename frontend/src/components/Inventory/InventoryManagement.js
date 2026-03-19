// frontend/src/components/Inventory/InventoryManagement.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import inventoryService from '../../services/inventoryService';
import EquipmentList from './EquipmentList';
import EquipmentForm from './EquipmentForm';
import EquipmentFilters from './EquipmentFilters';
import EquipmentStats from './EquipmentStats';
import AssignmentModal from './AssignmentModal';
import HistoryModal from './HistoryModal';
import { Package, Plus, CheckCircle, AlertCircle, Upload, Download, List, LayoutGrid } from 'lucide-react';

const InventoryManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [equipos, setEquipos] = useState([]);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState(null);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    tipo: '',
    estado: '',
    instalador_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadSede, setUploadSede] = useState('');
  const [ciudades, setCiudades] = useState([]);
  const excelInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'detail'
  const [equiposAgrupados, setEquiposAgrupados] = useState([]);
  const [loadingGrouped, setLoadingGrouped] = useState(false);

  // Cargar ciudades del sistema
  useEffect(() => {
    inventoryService.getCiudades().then(data => {
      if (Array.isArray(data)) setCiudades(data);
    });
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (viewMode === 'detail') {
      loadEquipment();
    } else {
      loadGroupedEquipment();
    }
    loadStats();
  }, [filters, viewMode]);

  // Cargar equipos con filtros
const loadEquipment = useCallback(async () => {
  try {
    setLoading(true);
    setError('');

    let response;
    if (user.rol === 'instalador') {
      response = await inventoryService.getMisEquipos();
    } else {
      response = await inventoryService.getEquipment(filters);
    }

    console.log('✅ Respuesta de equipos:', response);

    // ✅ Normalizar respuesta SIEMPRE de la misma forma
    const equipos = response.equipos ?? response.data ?? [];
    const pagination = response.pagination ?? {};

    setEquipos(equipos);
    setPagination(pagination);

    console.log('📦 Equipos procesados:', equipos.length);
    console.log('📄 Paginación:', pagination);

  } catch (error) {
    console.error('❌ Error cargando equipos:', error);
    inventoryService.handleError(error, setError);
    setEquipos([]);
  } finally {
    setLoading(false);
  }
}, [filters, user.rol]);
  // Cargar inventario agrupado por tipo/nombre
  const loadGroupedEquipment = useCallback(async () => {
    try {
      setLoadingGrouped(true);
      setError('');

      if (user.rol === 'instalador') {
        // Para instaladores: agrupar sus propios equipos localmente
        const response = await inventoryService.getMisEquipos();
        const lista = response.equipos || [];
        const mapa = {};
        lista.forEach(eq => {
          const key = `${eq.tipo}||${eq.nombre}`;
          if (!mapa[key]) {
            mapa[key] = {
              tipo: eq.tipo,
              nombre: eq.nombre,
              cantidad_total: 0,
              disponibles: 0,
              asignados: 0,
              instalados: 0,
              danados: 0,
              otros: 0,
            };
          }
          mapa[key].cantidad_total++;
          if (eq.estado === 'disponible')  mapa[key].disponibles++;
          else if (eq.estado === 'asignado') mapa[key].asignados++;
          else if (eq.estado === 'instalado') mapa[key].instalados++;
          else if (eq.estado === 'dañado')  mapa[key].danados++;
          else mapa[key].otros++;
        });
        setEquiposAgrupados(Object.values(mapa));
      } else {
        const data = await inventoryService.getGroupedEquipment({
          tipo: filters.tipo,
          search: filters.search
        });
        setEquiposAgrupados(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('❌ Error cargando inventario agrupado:', error);
      setEquiposAgrupados([]);
    } finally {
      setLoadingGrouped(false);
    }
  }, [filters.tipo, filters.search, user.rol]);

  // Cargar estadísticas
// frontend/src/components/Inventory/InventoryManagement.js
// ✅ CORREGIDO: Cargar estadísticas según el rol
const loadStats = async () => {
  try {
    if (user.rol === 'instalador') {
      // Para instalador: calcular estadísticas desde sus equipos
      console.log('📊 Calculando estadísticas del instalador desde equipos...');
      const response = await inventoryService.getMisEquipos();
      const misEquipos = response.equipos || [];
      
      const statsInstalador = {
        total: misEquipos.length,
        disponibles: misEquipos.filter(e => e.estado === 'disponible').length,
        instalados: misEquipos.filter(e => e.estado === 'instalado').length,
        asignados: misEquipos.filter(e => e.estado === 'asignado').length,
        danados: misEquipos.filter(e => e.estado === 'dañado').length
      };
      
      console.log('📊 Estadísticas calculadas del instalador:', statsInstalador);
      setStats(statsInstalador);
      
    } else {
      // Para admin/supervisor: usar endpoint de estadísticas generales
      console.log('📊 Obteniendo estadísticas generales...');
      const response = await inventoryService.getStats();
      console.log('📊 Estadísticas recibidas:', response);
      
      // Manejar la estructura de la respuesta
      if (response.data) {
        setStats(response.data);
      } else if (response.message) {
        setStats(response.message);
      } else {
        setStats(response);
      }
    }
  } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
    // No mostrar error por estadísticas, es opcional
    setStats(null);
  }
};

 // Exportar equipos a CSV
  const handleExportarCSV = () => {
    try {
      console.log('📊 Exportando equipos a CSV:', equipos.length, 'registros');
      
      if (!equipos || equipos.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      const headers = ['Tipo', 'Marca', 'Modelo', 'Serie', 'MAC', 'Estado', 'Asignado a', 'Cliente', 'Ubicación', 'Fecha Ingreso', 'Observaciones'];
      const rows = equipos.map(equipo => [
        equipo.tipo || '',
        equipo.marca || '',
        equipo.modelo || '',
        equipo.numero_serie || '',
        equipo.mac_address || '',
        equipo.estado || '',
        equipo.instalador_nombre || '',
        equipo.cliente_nombre || '',
        equipo.ubicacion || '',
        equipo.fecha_ingreso ? new Date(equipo.fecha_ingreso).toLocaleDateString() : '',
        equipo.observaciones || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ CSV exportado exitosamente');
    } catch (error) {
      console.error('❌ Error exportando CSV:', error);
      alert('Error al exportar: ' + error.message);
    }
  };
  // Descargar plantilla Excel
  const handleDownloadTemplate = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiBase}/inventory/bulk-upload/template`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error descargando plantilla');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_inventario.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error descargando plantilla: ' + err.message);
    }
  };

  // Subir archivo Excel masivo
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    setUploadingExcel(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('archivo', file);
      if (uploadSede) formData.append('sede', uploadSede);

      const apiBase = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiBase}/inventory/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();

      if (data.success) {
        let msg = `✅ ${data.insertados} equipo(s) importado(s) correctamente.`;
        if (data.erroresValidacion?.length > 0) {
          msg += ` ⚠️ ${data.erroresValidacion.length} fila(s) con errores de validación.`;
        }
        if (data.erroresInsercion?.length > 0) {
          msg += ` ❌ ${data.erroresInsercion.length} error(es) de inserción.`;
        }
        setSuccess(msg);
        loadEquipment();
        loadStats();
      } else {
        setError(data.message || 'Error al importar el archivo');
      }
    } catch (err) {
      setError('Error procesando el archivo: ' + err.message);
    } finally {
      setUploadingExcel(false);
    }
  };

  // Manejar cambios en filtros
  const handleFilterChange = (newFilters) => {
    setFilters({
      ...filters,
      ...newFilters,
      page: 1 // Resetear a primera página cuando cambian filtros
    });
  };

  // Manejar cambio de página
  const handlePageChange = (newPage) => {
    setFilters({
      ...filters,
      page: newPage
    });
  };

  // Crear nuevo equipo
  const handleCreate = () => {
    setSelectedEquipo(null);
    setShowForm(true);
  };

  // Editar equipo
  const handleEdit = (equipo) => {
    setSelectedEquipo(equipo);
    setShowForm(true);
  };

  // Eliminar equipo
  const handleDelete = async (equipo) => {
    if (!window.confirm(`¿Estás seguro de eliminar el equipo ${equipo.codigo}?`)) {
      return;
    }

    try {
      await inventoryService.deleteEquipment(equipo.id);
      setSuccess('Equipo eliminado exitosamente');
      loadEquipment();
      loadStats();
    } catch (error) {
      setError('Error al eliminar el equipo: ' + error.message);
    }
  };

  // Asignar equipo
  const handleAssign = (equipo) => {
    setSelectedEquipo(equipo);
    setShowAssignment(true);
  };

  // Devolver equipo
  const handleReturn = async (equipo) => {
    if (!window.confirm(`¿Confirmas la devolución del equipo ${equipo.codigo}?`)) {
      return;
    }

    try {
      await inventoryService.returnEquipment(equipo.id, {
        ubicacion_devolucion: 'Almacén Principal',
        notas: 'Devolución desde interfaz de gestión'
      });
      setSuccess('Equipo devuelto exitosamente');
      loadEquipment();
      loadStats();
    } catch (error) {
      setError('Error al devolver el equipo: ' + error.message);
    }
  };

  // Ver historial
  const handleHistory = (equipo) => {
    setSelectedEquipo(equipo);
    setShowHistory(true);
  };

  // Manejar envío del formulario
  const handleFormSubmit = async (equipmentData) => {
    try {
      if (selectedEquipo) {
        await inventoryService.updateEquipment(selectedEquipo.id, equipmentData);
        setSuccess('Equipo actualizado exitosamente');
      } else {
        const result = await inventoryService.createEquipment(equipmentData);
        const cantidad = equipmentData.cantidad || 1;
        if (cantidad > 1) {
          const creados = Array.isArray(result?.data) ? result.data.length : cantidad;
          const errores = result?.errores?.length || 0;
          setSuccess(`${creados} equipo(s) creado(s) exitosamente${errores > 0 ? ` (${errores} con error)` : ''}`);
        } else {
          setSuccess('Equipo creado exitosamente');
        }
      }

      setShowForm(false);
      loadEquipment();
      loadStats();
    } catch (error) {
      setError('Error al guardar el equipo: ' + error.message);
    }
  };

  // Manejar asignación
  const handleAssignmentSubmit = async (assignmentData) => {
    try {
      await inventoryService.assignEquipment(selectedEquipo.id, assignmentData);
      setSuccess('Equipo asignado exitosamente');
      setShowAssignment(false);
      loadEquipment();
      loadStats();
    } catch (error) {
      setError('Error al asignar el equipo: ' + error.message);
    }
  };

  // Limpiar mensajes
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header con gradiente similar al dashboard */}
      <div className="bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center relative z-10">
          <div className="mb-4 lg:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <Package size={32} className="text-white" />
              <h1 className="text-2xl md:text-3xl font-bold">
                {user.rol === 'instalador' ? 'Mis Equipos' : 'Gestión de Inventarios'}
              </h1>
            </div>
            <p className="text-lg opacity-90">
              {user.rol === 'instalador'
                ? 'Equipos asignados a ti'
                : 'Administra equipos, asignaciones e instalaciones'}
            </p>
          </div>
          
          {user.rol === 'administrador' && (
            <div className="flex flex-wrap gap-2">
              {/* Botones de importación masiva */}
              <button
                onClick={handleDownloadTemplate}
                className="bg-white/10 hover:bg-white/20 transition-all rounded-lg py-2 px-4 backdrop-blur-sm flex items-center space-x-2 text-sm font-medium"
                title="Descargar plantilla Excel para importación"
              >
                <Download size={16} />
                <span>Plantilla</span>
              </button>

              <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2">
                <select
                  value={uploadSede}
                  onChange={(e) => setUploadSede(e.target.value)}
                  className="bg-transparent text-white text-sm py-2 px-1 outline-none cursor-pointer"
                  style={{ minWidth: '140px' }}
                >
                  <option value="" className="text-gray-800 bg-white">Sede (opcional)</option>
                  {ciudades.map(ciudad => (
                    <option key={ciudad.id} value={ciudad.nombre} className="text-gray-800 bg-white">
                      {ciudad.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <label className={`cursor-pointer bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 px-4 backdrop-blur-sm flex items-center space-x-2 font-medium ${uploadingExcel ? 'opacity-60 cursor-wait' : ''}`}>
                <Upload size={20} />
                <span>{uploadingExcel ? 'Importando...' : 'Importar Excel'}</span>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  disabled={uploadingExcel}
                />
              </label>

              <button
                onClick={handleCreate}
                className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-4 md:px-6 backdrop-blur-sm flex items-center space-x-2 font-medium"
              >
                <Plus size={20} />
                <span>Nuevo Equipo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes de estado con diseño mejorado */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 font-medium">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
            <span className="text-green-700 font-medium">{success}</span>
          </div>
        </div>
      )}

{/* Estadísticas - admin/supervisor/secretaria */}
{(user.rol === 'administrador' || user.rol === 'supervisor' || user.rol === 'secretaria') && stats && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <EquipmentStats stats={stats} />
  </div>
)}
{/* Estadísticas simplificadas para instalador */}
{user.rol === 'instalador' && stats && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold mb-4">Mis Equipos</h3>
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <p className="text-3xl font-bold text-blue-600">{stats.total || 0}</p>
        <p className="text-sm text-gray-600">Total Asignados</p>
      </div>
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <p className="text-3xl font-bold text-green-600">{stats.disponibles || 0}</p>
        <p className="text-sm text-gray-600">Disponibles</p>
      </div>
      <div className="text-center p-4 bg-purple-50 rounded-lg">
        <p className="text-3xl font-bold text-purple-600">{stats.instalados || 0}</p>
        <p className="text-sm text-gray-600">Instalados</p>
      </div>
    </div>
  </div>
)}

      {/* Filtros con fondo blanco y sombra */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <EquipmentFilters
          filters={filters}
  onFilterChange={handleFilterChange}
  userRole={user.rol}
  onExport={handleExportarCSV}
        />
      </div>

      {/* Toggle de vista */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('grouped')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'grouped' ? 'bg-[#0e6493] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          <LayoutGrid size={16} />
          Resumen por producto
        </button>
        <button
          onClick={() => setViewMode('detail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'detail' ? 'bg-[#0e6493] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          <List size={16} />
          Detalle individual
        </button>
      </div>

      {/* Vista agrupada */}
      {viewMode === 'grouped' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loadingGrouped ? (
            <div className="p-8 text-center text-gray-500">Cargando inventario...</div>
          ) : equiposAgrupados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay productos en el inventario</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Producto</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-green-700">Disponibles</th>
                  <th className="text-center px-4 py-3 font-semibold text-blue-700">Asignados</th>
                  <th className="text-center px-4 py-3 font-semibold text-purple-700">Instalados</th>
                  <th className="text-center px-4 py-3 font-semibold text-red-700">Dañados</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Otros</th>
                  {user.rol !== 'instalador' && (
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equiposAgrupados.map((grupo, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded capitalize">
                        {grupo.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{grupo.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-gray-800">{grupo.cantidad_total}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${grupo.disponibles > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {grupo.disponibles}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${grupo.asignados > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {grupo.asignados}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${grupo.instalados > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {grupo.instalados}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${grupo.daniados > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {grupo.daniados}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                      {(grupo.en_mantenimiento || 0) + (grupo.perdidos || 0) + (grupo.devueltos || 0)}
                    </td>
                    {user.rol !== 'instalador' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setViewMode('detail');
                            handleFilterChange({ search: grupo.nombre, tipo: grupo.tipo });
                          }}
                          className="text-xs text-[#0e6493] hover:underline font-medium"
                        >
                          Ver detalle
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Lista detallada de equipos con fondo blanco y sombra */}
      {viewMode === 'detail' && (
      <div className="bg-white rounded-lg shadow-md">
        <EquipmentList
          equipos={equipos}
          pagination={pagination}
          loading={loading}
          userRole={user.rol}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAssign={handleAssign}
          onReturn={handleReturn}
          onHistory={handleHistory}
          onPageChange={handlePageChange}
        />
      </div>
      )}

      {/* Modales */}
      {showForm && (
        <EquipmentForm
          equipo={selectedEquipo}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showAssignment && (
        <AssignmentModal
          equipo={selectedEquipo}
          onSubmit={handleAssignmentSubmit}
          onCancel={() => setShowAssignment(false)}
        />
      )}

      {showHistory && (
        <HistoryModal
          equipo={selectedEquipo}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default InventoryManagement;