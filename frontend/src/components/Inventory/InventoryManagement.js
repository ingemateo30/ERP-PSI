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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventarios</h1>
          <p className="text-gray-600">Administra equipos, asignaciones e instalaciones</p>
        </div>
        {user.rol !== 'instalador' && (
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo Equipo</span>
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Estadísticas */}
      {stats && <EquipmentStats stats={stats} />}

      {/* Filtros */}
      <EquipmentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        userRole={user.rol}
      />

      {/* Lista de equipos */}
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

      {/* Modal de formulario */}
      {showForm && (
        <EquipmentForm
          equipo={selectedEquipo}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Modal de asignación */}
      {showAssignment && (
        <AssignmentModal
          equipo={selectedEquipo}
          onSubmit={handleAssignmentSubmit}
          onCancel={() => setShowAssignment(false)}
        />
      )}

      {/* Modal de historial */}
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