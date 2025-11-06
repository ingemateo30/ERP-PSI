// frontend/src/components/Inventory/InventoryManagement.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import inventoryService from '../../services/inventoryService';
import EquipmentList from './EquipmentList';
import EquipmentForm from './EquipmentForm';
import EquipmentFilters from './EquipmentFilters';
import EquipmentStats from './EquipmentStats';
import AssignmentModal from './AssignmentModal';
import HistoryModal from './HistoryModal';
import { Package, Plus, CheckCircle, AlertCircle } from 'lucide-react';

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

  // Cargar datos iniciales
  useEffect(() => {
    loadEquipment();
    loadStats();
  }, [filters]);

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
  // Cargar estadísticas
// frontend/src/components/Inventory/InventoryManagement.js
const loadStats = async () => {
  try {
    const response = await inventoryService.getStats();
    console.log('📊 Estadísticas recibidas raw:', response);

    // Normalizar el payload base (cubre: response, response.data, response.stats, response.message)
    const raw = (response && typeof response === 'object')
      ? (response.data ?? response.stats ?? response.message ?? response)
      : {};

    // Si raw es array (por error), lo ignoramos y dejamos objetos vacíos
    const safeRaw = Array.isArray(raw) ? {} : (raw || {});

    // Helper para convertir a número seguro (si pasa '7' -> 7, si pasa null/NaN -> 0)
    const toNumber = (v) => {
      const n = Number(String(v ?? 0).replace(/[^0-9\.\-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    // Detectores simples por forma de la respuesta
    const hasGeneral = !!safeRaw.general && typeof safeRaw.general === 'object';
    const hasTopLevelTotals = 'total' in safeRaw || 'disponibles' in safeRaw || 'asignados' in safeRaw;

    // Construimos estructura final esperada por EquipmentStats (defensiva)
    let normalized = {
      general: {
        total_equipos: 0,
        disponibles: 0,
        asignados: 0,
        instalados: 0,
        en_mantenimiento: 0,
        dañados: 0,
        perdidos: 0,
        valor_total_inventario: 0
      },
      por_tipo: [],
      por_instalador: [],
      movimientos_recientes: []
    };

    if (hasGeneral) {
      const g = safeRaw.general;
      normalized.general = {
        total_equipos: toNumber(g.total_equipos ?? g.total ?? g.totalEquipos),
        disponibles: toNumber(g.disponibles ?? g.disponiblesEquipos ?? safeRaw.disponibles),
        asignados: toNumber(g.asignados ?? g.asignadosEquipos ?? safeRaw.asignados),
        instalados: toNumber(g.instalados ?? g.instaladosEquipos ?? safeRaw.instalados),
        en_mantenimiento: toNumber(g.en_mantenimiento ?? g.en_reparacion ?? g.enReparacion ?? safeRaw.en_reparacion),
        dañados: toNumber(g.dañados ?? g.danados ?? safeRaw.danados),
        perdidos: toNumber(g.perdidos ?? safeRaw.perdidos),
        valor_total_inventario: toNumber(g.valor_total_inventario ?? g.valor_inventario ?? safeRaw.valor_inventario)
      };

      normalized.por_tipo = Array.isArray(safeRaw.por_tipo) ? safeRaw.por_tipo : (safeRaw.por_tipo ?? []);
      normalized.por_instalador = Array.isArray(safeRaw.por_instalador) ? safeRaw.por_instalador : (safeRaw.por_instalador ?? []);
      normalized.movimientos_recientes = Array.isArray(safeRaw.movimientos_recientes) ? safeRaw.movimientos_recientes : (safeRaw.movimientos_recientes ?? []);

    } else if (hasTopLevelTotals) {
      // Cuando la API devuelve { total, disponibles, asignados, ... }
      normalized.general = {
        total_equipos: toNumber(safeRaw.total ?? safeRaw.totalEquipos),
        disponibles: toNumber(safeRaw.disponibles ?? safeRaw.disponiblesEquipos),
        asignados: toNumber(safeRaw.asignados ?? safeRaw.asignadosEquipos),
        instalados: toNumber(safeRaw.instalados ?? safeRaw.instaladosEquipos),
        en_mantenimiento: toNumber(safeRaw.en_reparacion ?? safeRaw.reparacion ?? safeRaw.en_mantenimiento),
        dañados: toNumber(safeRaw.danados),
        perdidos: toNumber(safeRaw.perdidos),
        valor_total_inventario: toNumber(safeRaw.valor_inventario ?? safeRaw.valorTotalInventario)
      };

      normalized.por_tipo = Array.isArray(safeRaw.por_tipo) ? safeRaw.por_tipo : (safeRaw.por_tipo ?? []);
      normalized.por_instalador = Array.isArray(safeRaw.por_instalador) ? safeRaw.por_instalador : (safeRaw.por_instalador ?? []);
      normalized.movimientos_recientes = Array.isArray(safeRaw.movimientos_recientes) ? safeRaw.movimientos_recientes : (safeRaw.movimientos_recientes ?? []);
    } else {
      // Intento de mapear claves alternativas que ya normalizaste en consola
      normalized.general = {
        total_equipos: toNumber(safeRaw.totalEquipos ?? safeRaw.total ?? 0),
        disponibles: toNumber(safeRaw.disponiblesEquipos ?? safeRaw.disponibles ?? 0),
        asignados: toNumber(safeRaw.asignadosEquipos ?? safeRaw.asignados ?? 0),
        instalados: toNumber(safeRaw.instaladosEquipos ?? safeRaw.instalados ?? 0),
        en_mantenimiento: toNumber(safeRaw.reparacionEquipos ?? safeRaw.en_reparacion ?? 0),
        dañados: toNumber(safeRaw.danadosEquipos ?? safeRaw.danados ?? 0),
        perdidos: toNumber(safeRaw.perdidosEquipos ?? safeRaw.perdidos ?? 0),
        valor_total_inventario: toNumber(safeRaw.valorInventario ?? safeRaw.valor_total_inventario ?? 0)
      };

      normalized.por_tipo = Array.isArray(safeRaw.por_tipo) ? safeRaw.por_tipo : (safeRaw.por_tipo ?? []);
      normalized.por_instalador = Array.isArray(safeRaw.por_instalador) ? safeRaw.por_instalador : (safeRaw.por_instalador ?? []);
      normalized.movimientos_recientes = Array.isArray(safeRaw.movimientos_recientes) ? safeRaw.movimientos_recientes : (safeRaw.movimientos_recientes ?? []);
    }

    // Evitar referencias mutables accidentales
    setStats(JSON.parse(JSON.stringify(normalized)));

    console.log('📌 Estadísticas procesadas (defensivas):', normalized);

  } catch (error) {
    console.error('❌ Error en loadStats (safe):', error);
    setStats({
      general: {
        total_equipos: 0,
        disponibles: 0,
        asignados: 0,
        instalados: 0,
        en_mantenimiento: 0,
        dañados: 0,
        perdidos: 0,
        valor_total_inventario: 0
      },
      por_tipo: [],
      por_instalador: [],
      movimientos_recientes: []
    });
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
        await inventoryService.createEquipment(equipmentData);
        setSuccess('Equipo creado exitosamente');
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
              <h1 className="text-2xl md:text-3xl font-bold">Gestión de Inventarios</h1>
            </div>
            <p className="text-lg opacity-90">Administra equipos, asignaciones e instalaciones</p>
          </div>
          
          {user.rol !== 'instalador' && (
            <button
              onClick={handleCreate}
              className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-4 md:px-6 backdrop-blur-sm flex items-center space-x-2 font-medium"
            >
              <Plus size={20} />
              <span>Nuevo Equipo</span>
            </button>
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

{/* Estadísticas - Solo admin/supervisor */}
{user.rol !== 'instalador' && stats && (
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

      {/* Lista de equipos con fondo blanco y sombra */}
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