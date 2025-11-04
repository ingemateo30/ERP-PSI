// frontend/src/components/Instalador/ModalCompletarInstalacion.js

import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, Package, CheckCircle } from 'lucide-react';

const ModalCompletarInstalacion = ({ isOpen, onClose, instalacion, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarEquiposDisponibles();
    }
  }, [isOpen]);

  const cargarEquiposDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/instalador/mis-equipos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEquiposDisponibles(data.equipos || []);
      }
    } catch (error) {
      console.error('Error cargando equipos:', error);
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleEquipo = (equipoId) => {
    setEquiposSeleccionados(prev => {
      if (prev.includes(equipoId)) {
        return prev.filter(id => id !== equipoId);
      } else {
        return [...prev, equipoId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!foto) {
      alert('❌ Debes subir una foto de la instalación');
      return;
    }

    if (equiposSeleccionados.length === 0) {
      alert('❌ Debes seleccionar al menos un equipo instalado');
      return;
    }

    setLoading(true);

    try {
     const token = localStorage.getItem('token');
if (!token) {
    console.error('❌ No hay token');
    return;
}
      
      const formData = {
        equipos: equiposSeleccionados,
        foto: fotoPreview, // Base64
        observaciones
      };

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/instalador/instalacion/${instalacion.id}/completar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('✅ Instalación completada exitosamente');
        onSuccess();
        handleClose();
      } else {
        alert('❌ Error: ' + (data.message || 'No se pudo completar la instalación'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFoto(null);
    setFotoPreview(null);
    setEquiposSeleccionados([]);
    setObservaciones('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <CheckCircle className="mr-2 text-green-600" size={24} />
              Completar Instalación
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Cliente: {instalacion?.cliente_nombre}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Foto de instalación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline mr-2" size={18} />
              Foto de la Instalación *
            </label>
            
            {!fotoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload size={48} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click para subir foto</span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG hasta 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFoto(null);
                    setFotoPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Equipos instalados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package className="inline mr-2" size={18} />
              Equipos Instalados * ({equiposSeleccionados.length} seleccionados)
            </label>
            
            {equiposDisponibles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Package size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No tienes equipos asignados</p>
                <p className="text-sm text-gray-400">Contacta al administrador</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {equiposDisponibles.map(equipo => (
                  <label
                    key={equipo.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={equiposSeleccionados.includes(equipo.id)}
                      onChange={() => toggleEquipo(equipo.id)}
                      className="w-4 h-4 text-[#0e6493] rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{equipo.nombre}</p>
                      <p className="text-sm text-gray-600">
                        {equipo.tipo} - S/N: {equipo.numero_serie}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              placeholder="Detalles adicionales de la instalación..."
            />
          </div>

          {/* Botones */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !foto || equiposSeleccionados.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Completando...' : '✓ Completar Instalación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCompletarInstalacion;