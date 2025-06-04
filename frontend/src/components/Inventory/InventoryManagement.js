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
      
      console.log('🔍 Cargando equipos con filtros:', filters);
      
      const response = await inventoryService.getEquipment(filters);
      console.log('✅ Respuesta de equipos:', response);
      
      // Manejar diferentes estructuras de respuesta
      let equipos = [];
      let pagination = {};
      
      if (response.equipos && response.pagination) {
        // Estructura directa: { equipos: [], pagination: {} }
        equipos = response.equipos;
        pagination = response.pagination;
        console.log('📋 Estructura directa detectada');
      } else if (response.data && response.data.equipos) {
        // Estructura: { success: true, data: { equipos: [], pagination: {} } }
        equipos = response.data.equipos;
        pagination = response.data.pagination || {};
        console.log('📋 Estructura con data detectada');
      } else if (response.message && response.message.equipos) {
        // Estructura: { success: true, message: { equipos: [], pagination: {} } }
        equipos = response.message.equipos;
        pagination = response.message.pagination || {};
        console.log('📋 Estructura con message detectada');
      } else if (Array.isArray(response)) {
        // Respuesta directa como array
        equipos = response;
        pagination = { total: response.length, currentPage: 1, totalPages: 1 };
        console.log('📋 Array directo detectado');
      } else {
        console.warn('⚠️ Estructura de respuesta inesperada:', response);
        equipos = [];
        pagination = {};
      }
      
      console.log('📦 Equipos procesados:', equipos.length);
      console.log('📄 Paginación:', pagination);
      
      setEquipos(equipos);
      setPagination(pagination);
      
    } catch (error) {
      console.error('❌ Error cargando equipos:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      setError('Error al cargar los equipos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Cargar estadísticas
  const loadStats = async () => {
    try {
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
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // No mostrar error por estadísticas, es opcional
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

      {/* Estadísticas con el estilo del dashboard */}
      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <EquipmentStats stats={stats} />
        </div>
      )}

      {/* Filtros con fondo blanco y sombra */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <EquipmentFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          userRole={user.rol}
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