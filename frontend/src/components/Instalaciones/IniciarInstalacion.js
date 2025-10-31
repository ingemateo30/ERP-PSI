// frontend/src/components/Instalaciones/IniciarInstalacion.js
import { API_BASE_URL } from '../../services/apiService';
import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Package,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  Upload,
  Search,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const IniciarInstalacion = ({ instalacion, onClose, onSuccess }) => {
  const [paso, setPaso] = useState(1); // 1: Fotos, 2: Equipos, 3: Completar
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados para fotos
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDespues, setFotoDespues] = useState(null);
  const [previsualizacionAntes, setPrevisualizacionAntes] = useState(null);
  const [previsualizacionDespues, setPrevisualizacionDespues] = useState(null);

  // Estados para equipos
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [equiposAsignados, setEquiposAsignados] = useState([]);
  const [busquedaEquipo, setBusquedaEquipo] = useState('');

  // Estados para completar
  const [observaciones, setObservaciones] = useState(instalacion.observaciones || '');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Cargar equipos disponibles
  useEffect(() => {
    cargarEquiposDisponibles();
    
    // Si la instalación ya tiene equipos, cargarlos
    if (instalacion.equipos_instalados) {
      try {
        const equipos = typeof instalacion.equipos_instalados === 'string' 
          ? JSON.parse(instalacion.equipos_instalados)
          : instalacion.equipos_instalados;
        setEquiposAsignados(equipos || []);
      } catch (e) {
        console.error('Error parseando equipos:', e);
      }
    }

    // Cargar fotos existentes si las hay
    if (instalacion.fotos_instalacion) {
      try {
        const fotos = typeof instalacion.fotos_instalacion === 'string'
          ? JSON.parse(instalacion.fotos_instalacion)
          : instalacion.fotos_instalacion;
        
        if (fotos && fotos.length > 0) {
          fotos.forEach(foto => {
            if (foto.descripcion?.includes('antes') || foto.descripcion?.includes('Antes')) {
              setPrevisualizacionAntes(foto.url);
            } else if (foto.descripcion?.includes('después') || foto.descripcion?.includes('Después')) {
              setPrevisualizacionDespues(foto.url);
            }
          });
        }
      } catch (e) {
        console.error('Error parseando fotos:', e);
      }
    }
  }, [instalacion]);

  const cargarEquiposDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/inventario/equipos/disponibles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setEquiposDisponibles(response.data.data || []);
      }
    } catch (err) {
      console.error('Error cargando equipos:', err);
    }
  };

  // Manejar selección de fotos
  const manejarFotoAntes = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      setFotoAntes(archivo);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrevisualizacionAntes(reader.result);
      };
      reader.readAsDataURL(archivo);
    }
  };

  const manejarFotoDespues = (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      setFotoDespues(archivo);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrevisualizacionDespues(reader.result);
      };
      reader.readAsDataURL(archivo);
    }
  };

  // Agregar equipo a la instalación
  const agregarEquipo = (equipo) => {
    const equipoExiste = equiposAsignados.find(e => e.equipo_id === equipo.id);
    if (equipoExiste) {
      setError('Este equipo ya fue agregado');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const nuevoEquipo = {
      equipo_id: equipo.id,
      equipo_codigo: equipo.codigo,
      equipo_nombre: equipo.nombre,
      tipo: equipo.tipo,
      marca: equipo.marca,
      cantidad: equipo.tipo === 'cable' ? 1 : 1,
      numero_serie: equipo.numero_serie || '',
      observaciones: ''
    };

    setEquiposAsignados([...equiposAsignados, nuevoEquipo]);
    setBusquedaEquipo('');
  };

  const quitarEquipo = (index) => {
    setEquiposAsignados(equiposAsignados.filter((_, i) => i !== index));
  };

  const actualizarEquipo = (index, campo, valor) => {
    const nuevosEquipos = [...equiposAsignados];
    nuevosEquipos[index][campo] = valor;
    setEquiposAsignados(nuevosEquipos);
  };

  // Iniciar instalación
  const iniciarInstalacion = async () => {
    if (!fotoAntes && !previsualizacionAntes) {
      setError('Debes subir una foto del lugar antes de comenzar');
      return;
    }

    try {
      setProcesando(true);
      setError(null);

      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (fotoAntes) {
        formData.append('foto_antes', fotoAntes);
      }

      const response = await axios.put(
        `${API_BASE_URL}/instalaciones/${instalacion.id}/iniciar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSuccess('Instalación iniciada correctamente');
        setPaso(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error iniciando instalación');
    } finally {
      setProcesando(false);
    }
  };

  // Guardar progreso (equipos y observaciones)
  const guardarProgreso = async () => {
    try {
      setProcesando(true);
      setError(null);

      const token = localStorage.getItem('token');
      const datos = {
        equipos_instalados: equiposAsignados,
        observaciones: observaciones
      };

      const response = await axios.put(
        `${API_BASE_URL}/instalaciones/${instalacion.id}/actualizar`,
        datos,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess('Progreso guardado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error guardando progreso');
    } finally {
      setProcesando(false);
    }
  };

  // Completar instalación
  const completarInstalacion = async () => {
    if (!fotoDespues && !previsualizacionDespues) {
      setError('Debes subir una foto del trabajo terminado');
      return;
    }

    try {
      setProcesando(true);
      setError(null);

      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (fotoDespues) {
        formData.append('foto_despues', fotoDespues);
      }
      
      formData.append('equipos_instalados', JSON.stringify(equiposAsignados));
      formData.append('observaciones', observaciones);
      formData.append('estado', 'completada');

      const response = await axios.put(
        `${API_BASE_URL}/instalaciones/${instalacion.id}/completar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSuccess('¡Instalación completada exitosamente!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error completando instalación');
    } finally {
      setProcesando(false);
    }
  };

  // Cancelar instalación
  const cancelarInstalacion = async () => {
    if (!motivoCancelacion.trim()) {
      setError('Debes especificar el motivo de la cancelación');
      return;
    }

    try {
      setProcesando(true);
      setError(null);

      const token = localStorage.getItem('token');
      const datos = {
        estado: 'cancelada',
        motivo_cancelacion: motivoCancelacion,
        observaciones: observaciones
      };

      const response = await axios.put(
        `${API_BASE_URL}/instalaciones/${instalacion.id}/actualizar`,
        datos,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess('Instalación cancelada');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error cancelando instalación');
    } finally {
      setProcesando(false);
    }
  };

  const equiposFiltrados = equiposDisponibles.filter(equipo =>
    equipo.codigo.toLowerCase().includes(busquedaEquipo.toLowerCase()) ||
    equipo.nombre.toLowerCase().includes(busquedaEquipo.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0e6493] text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Instalación: {instalacion.cliente_nombre}</h2>
            <p className="text-sm opacity-90">{instalacion.direccion_instalacion}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-100 p-4 flex items-center justify-center space-x-4">
          {['Fotos Inicio', 'Equipos', 'Completar'].map((label, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  paso > index + 1
                    ? 'bg-green-500 text-white'
                    : paso === index + 1
                    ? 'bg-[#0e6493] text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {paso > index + 1 ? <CheckCircle size={20} /> : index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{label}</span>
              {index < 2 && <div className="w-12 h-0.5 bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle size={20} className="mr-2 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Contenido - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PASO 1: Fotos de Inicio */}
          {paso === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Foto del Lugar (Antes)</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {previsualizacionAntes ? (
                    <div className="relative">
                      <img
                        src={previsualizacionAntes}
                        alt="Vista previa antes"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setFotoAntes(null);
                          setPrevisualizacionAntes(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 mb-2">Click para subir foto</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={manejarFotoAntes}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-500">Formato: JPG, PNG (Max 5MB)</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Equipos */}
          {paso === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Equipos Asignados</h3>
                
                {/* Buscador de equipos */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={busquedaEquipo}
                      onChange={(e) => setBusquedaEquipo(e.target.value)}
                      placeholder="Buscar equipo por código o nombre..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    />
                  </div>

                  {/* Resultados de búsqueda */}
                  {busquedaEquipo && (
                    <div className="mt-2 border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                      {equiposFiltrados.length > 0 ? (
                        equiposFiltrados.map((equipo) => (
                          <button
                            key={equipo.id}
                            onClick={() => agregarEquipo(equipo)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{equipo.codigo} - {equipo.nombre}</p>
                                <p className="text-sm text-gray-500">{equipo.tipo} • {equipo.marca}</p>
                              </div>
                              <Plus size={20} className="text-[#0e6493]" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-gray-500 text-center">No se encontraron equipos</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de equipos asignados */}
                <div className="space-y-3">
                  {equiposAsignados.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                      <Package size={48} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">No hay equipos asignados</p>
                    </div>
                  ) : (
                    equiposAsignados.map((equipo, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-800">{equipo.equipo_codigo}</p>
                            <p className="text-sm text-gray-600">{equipo.equipo_nombre}</p>
                            <p className="text-xs text-gray-500">{equipo.tipo} • {equipo.marca}</p>
                          </div>
                          <button
                            onClick={() => quitarEquipo(index)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cantidad {equipo.tipo === 'cable' ? '(metros)' : ''}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={equipo.cantidad}
                              onChange={(e) => actualizarEquipo(index, 'cantidad', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Serial/MAC
                            </label>
                            <input
                              type="text"
                              value={equipo.numero_serie}
                              onChange={(e) => actualizarEquipo(index, 'numero_serie', e.target.value)}
                              placeholder="Ej: TPL2024001"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observaciones del equipo
                          </label>
                          <input
                            type="text"
                            value={equipo.observaciones}
                            onChange={(e) => actualizarEquipo(index, 'observaciones', e.target.value)}
                            placeholder="Ej: Instalado en sala principal"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Observaciones generales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones Generales
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows="4"
                  placeholder="Detalles técnicos, problemas encontrados, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493]"
                />
              </div>
            </div>
          )}

          {/* PASO 3: Completar */}
          {paso === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Foto del Trabajo Terminado (Después)</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {previsualizacionDespues ? (
                    <div className="relative">
                      <img
                        src={previsualizacionDespues}
                        alt="Vista previa después"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setFotoDespues(null);
                          setPrevisualizacionDespues(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 mb-2">Click para subir foto</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={manejarFotoDespues}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-500">Formato: JPG, PNG (Max 5MB)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Resumen */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-3">Resumen de la Instalación</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Equipos instalados:</span> {equiposAsignados.length}</p>
                  {equiposAsignados.map((eq, i) => (
                    <p key={i} className="ml-4 text-gray-600">
                      • {eq.equipo_codigo} - {eq.equipo_nombre} (x{eq.cantidad})
                    </p>
                  ))}
                </div>
              </div>

              {/* Opción de cancelar */}
              <div className="border-t pt-4">
                <label className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setMotivoCancelacion('');
                      }
                    }}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Cancelar esta instalación
                  </span>
                </label>

                {motivoCancelacion !== null && (
                  <textarea
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                    placeholder="Especifica el motivo de la cancelación..."
                    rows="3"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="bg-gray-50 p-6 flex items-center justify-between border-t">
          <div>
            {paso > 1 && (
              <button
                onClick={() => setPaso(paso - 1)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={procesando}
              >
                Anterior
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {paso === 1 && (
              <button
                onClick={iniciarInstalacion}
                disabled={procesando || (!fotoAntes && !previsualizacionAntes)}
                className="flex items-center space-x-2 bg-[#0e6493] hover:bg-[#0a4d6e] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{procesando ? 'Iniciando...' : 'Iniciar Instalación'}</span>
              </button>
            )}

            {paso === 2 && (
              <>
                <button
                  onClick={guardarProgreso}
                  disabled={procesando}
                  className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  <Save size={18} />
                  <span>{procesando ? 'Guardando...' : 'Guardar Progreso'}</span>
                </button>
                <button
                  onClick={() => setPaso(3)}
                  className="flex items-center space-x-2 bg-[#0e6493] hover:bg-[#0a4d6e] text-white px-6 py-2 rounded-lg transition-colors"
                >
                  <span>Continuar</span>
                </button>
              </>
            )}

            {paso === 3 && (
              <>
                {motivoCancelacion ? (
                  <button
                    onClick={cancelarInstalacion}
                    disabled={procesando || !motivoCancelacion.trim()}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    <span>{procesando ? 'Cancelando...' : 'Cancelar Instalación'}</span>
                  </button>
                ) : (
                  <button
                    onClick={completarInstalacion}
                    disabled={procesando || (!fotoDespues && !previsualizacionDespues)}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    <span>{procesando ? 'Completando...' : '✓ Completar Instalación'}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IniciarInstalacion;