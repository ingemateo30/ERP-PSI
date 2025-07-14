// =============================================
// FRONTEND: frontend/src/components/Clients/ClientsManagement.js - COMPLETO Y FUNCIONAL
// =============================================

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, RefreshCw, UserX, Users, X,
  AlertCircle, Loader2, Trash2, Edit, Eye, MapPin, Phone, Mail,
  Building, Wifi, Tv, Package, DollarSign, Check, Calculator
} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../../constants/clientConstants';
import { clientService } from '../../services/clientService';
import configService from '../../services/configService';
import ClientsList from './ClientsList';
import ClientEditForm from './ClientEditForm';
import ClientFilters from './ClientFilters';
import ClientStats from './ClientStats';
import ClientModal from './ClientModal';
import ClientesInactivos from './ClientesInactivos';

// ================================================================
// COMPONENTE: ServiciosSelector COMPLETO Y FUNCIONAL
// ================================================================
const ServiciosSelector = ({ serviciosSeleccionados = [], onServiciosChange, planesDisponibles = [], estratoCliente = 1 }) => {
  const [servicios, setServicios] = useState(serviciosSeleccionados);


  useEffect(() => {
    setServicios(serviciosSeleccionados);
  }, [serviciosSeleccionados]);


  const agregarServicio = () => {
    const nuevoServicio = {
      id: Date.now(),
      planInternetId: '',
      planTelevisionId: '',
      direccionServicio: '',
      nombreSede: '',
      contactoSede: '',
      telefonoSede: '',
      precioPersonalizado: false,
      precioInternetCustom: '',
      precioTelevisionCustom: '',
      descuentoCombo: 0,
      observaciones: '',
      generarFacturaSeparada: false,
      tipoContrato: 'con_permanencia',
      mesesPermanencia: 6
    };

    const nuevosServicios = [...servicios, nuevoServicio];
    setServicios(nuevosServicios);
    onServiciosChange(nuevosServicios);
  };

  const actualizarServicio = (index, campo, valor) => {
    const nuevosServicios = [...servicios];
    nuevosServicios[index][campo] = valor;

    // Auto-calcular descuento combo
    if (campo === 'planInternetId' || campo === 'planTelevisionId') {
      if (nuevosServicios[index].planInternetId && nuevosServicios[index].planTelevisionId) {
        nuevosServicios[index].descuentoCombo = 15;
      } else {
        nuevosServicios[index].descuentoCombo = 0;
      }

      // Auto-ajustar permanencia según los planes
      const planInternet = planesDisponibles.find(p => p.id == nuevosServicios[index].planInternetId);
      const planTV = planesDisponibles.find(p => p.id == nuevosServicios[index].planTelevisionId);

      let permanenciaMinima = 6; // Default
      if (planInternet && planInternet.permanencia_minima_meses) {
        permanenciaMinima = Math.max(permanenciaMinima, planInternet.permanencia_minima_meses);
      }
      if (planTV && planTV.permanencia_minima_meses) {
        permanenciaMinima = Math.max(permanenciaMinima, planTV.permanencia_minima_meses);
      }

      nuevosServicios[index].mesesPermanencia = permanenciaMinima;
    }

    setServicios(nuevosServicios);
    onServiciosChange(nuevosServicios);
  };

  const eliminarServicio = (index) => {
    const nuevosServicios = servicios.filter((_, i) => i !== index);
    setServicios(nuevosServicios);
    onServiciosChange(nuevosServicios);
  };

  // Función para calcular IVA según normativa
  const calcularIVA = (precio, tipoServicio, estrato) => {
    if (!precio || precio === 0) {
      return { precioSinIVA: 0, precioConIVA: 0, valorIVA: 0, aplicaIVA: false };
    }

    let aplicaIVA = false;

    if (tipoServicio === 'internet') {
      // Internet: Sin IVA para estratos 1,2,3 - Con IVA 19% para estratos 4,5,6
      aplicaIVA = estrato >= 4;
    } else if (tipoServicio === 'television') {
      // Televisión: SIEMPRE IVA 19%
      aplicaIVA = true;
    }

    const valorIVA = aplicaIVA ? (precio * 0.19) : 0;
    const precioConIVA = precio + valorIVA;

    return {
      precioSinIVA: precio,
      precioConIVA: precioConIVA,
      valorIVA: valorIVA,
      aplicaIVA: aplicaIVA
    };
  };

  // Función para calcular precios del servicio
  const calcularPrecioServicio = (servicio) => {
    let totalSinIVA = 0;
    let totalConIVA = 0;
    let totalIVA = 0;
    let detalles = [];
    let planInternet = null;
    let planTV = null;

    // Plan de Internet
    if (servicio.planInternetId) {
      planInternet = planesDisponibles.find(p => p.id == servicio.planInternetId);
      if (planInternet) {
        const precioBase = servicio.precioPersonalizado ?
          parseFloat(servicio.precioInternetCustom) || 0 :
          parseFloat(planInternet.precio) || 0;

        const calculoInternet = calcularIVA(precioBase, 'internet', parseInt(estratoCliente));

        totalSinIVA += calculoInternet.precioSinIVA;
        totalConIVA += calculoInternet.precioConIVA;
        totalIVA += calculoInternet.valorIVA;

        detalles.push({
          concepto: `Internet ${planInternet.nombre} (${planInternet.velocidad_bajada}MB)`,
          precioSinIVA: calculoInternet.precioSinIVA,
          precioConIVA: calculoInternet.precioConIVA,
          valorIVA: calculoInternet.valorIVA,
          aplicaIVA: calculoInternet.aplicaIVA
        });
      }
    }

    // Plan de Televisión
    if (servicio.planTelevisionId) {
      planTV = planesDisponibles.find(p => p.id == servicio.planTelevisionId);
      if (planTV) {
        // Para TV, el precio en BD ya incluye IVA, debemos extraer la base
        let precioBaseSinIVA;
        if (servicio.precioPersonalizado) {
          precioBaseSinIVA = parseFloat(servicio.precioTelevisionCustom) || 0;
        } else {
          const precioConIVA = parseFloat(planTV.precio) || 0;
          precioBaseSinIVA = Math.round(precioConIVA / 1.19);
        }

        const calculoTV = calcularIVA(precioBaseSinIVA, 'television', parseInt(estratoCliente));

        totalSinIVA += calculoTV.precioSinIVA;
        totalConIVA += calculoTV.precioConIVA;
        totalIVA += calculoTV.valorIVA;

        detalles.push({
          concepto: `TV ${planTV.nombre} (${planTV.canales_tv} canales)`,
          precioSinIVA: calculoTV.precioSinIVA,
          precioConIVA: calculoTV.precioConIVA,
          valorIVA: calculoTV.valorIVA,
          aplicaIVA: calculoTV.aplicaIVA
        });
      }
    }

    // Aplicar descuento combo
    let descuentoAplicado = 0;
    if (servicio.descuentoCombo > 0 && totalSinIVA > 0) {
      descuentoAplicado = totalSinIVA * (servicio.descuentoCombo / 100);
      totalSinIVA -= descuentoAplicado;

      // Recalcular IVA después del descuento
      totalIVA = 0;
      if (servicio.planInternetId && parseInt(estratoCliente) >= 4) {
        totalIVA += (totalSinIVA * 0.5) * 0.19;
      }
      if (servicio.planTelevisionId) {
        totalIVA += (totalSinIVA * 0.5) * 0.19;
      }
      totalConIVA = totalSinIVA + totalIVA;

      detalles.push({
        concepto: `Descuento combo (${servicio.descuentoCombo}%)`,
        precioSinIVA: -descuentoAplicado,
        precioConIVA: -descuentoAplicado,
        valorIVA: 0,
        aplicaIVA: false
      });
    }

    // Costo de instalación
    let costoInstalacion = 0;
    if (planInternet || planTV) {
      const planPrincipal = planInternet || planTV;
      if (servicio.tipoContrato === 'con_permanencia') {
        costoInstalacion = planPrincipal.costo_instalacion_permanencia || 50000;
      } else {
        costoInstalacion = planPrincipal.costo_instalacion_sin_permanencia || 150000;
      }
    }

    return {
      totalSinIVA: totalSinIVA,
      totalConIVA: totalConIVA,
      totalIVA: totalIVA,
      detalles: detalles,
      tieneInternet: !!servicio.planInternetId,
      tieneTV: !!servicio.planTelevisionId,
      esCombo: !!(servicio.planInternetId && servicio.planTelevisionId),
      planInternet: planInternet,
      planTV: planTV,
      descuentoAplicado: descuentoAplicado,
      costoInstalacion: costoInstalacion,
      tipoContrato: servicio.tipoContrato,
      mesesPermanencia: servicio.mesesPermanencia
    };
  };

  const planesInternet = planesDisponibles.filter(plan => plan.tipo === 'internet');
  const planesTV = planesDisponibles.filter(plan => plan.tipo === 'television');

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Servicios a Contratar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona los servicios que desea contratar el cliente. Puede agregar múltiples servicios para diferentes sedes.
          </p>
        </div>
        <button
          type="button"
          onClick={agregarServicio}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Servicio
        </button>
      </div>

      {/* Lista de servicios */}
      {servicios.map((servicio, index) => {
        const precio = calcularPrecioServicio(servicio);

        return (
          <div key={servicio.id} className="border border-gray-300 rounded-lg bg-white shadow-sm">
            {/* Encabezado del servicio */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {precio.tieneInternet && <Wifi className="w-4 h-4 text-blue-600" />}
                  {precio.tieneTV && <Tv className="w-4 h-4 text-purple-600" />}
                  {precio.esCombo && <Package className="w-4 h-4 text-green-600" />}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Servicio #{index + 1}
                    {servicio.nombreSede && ` - ${servicio.nombreSede}`}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {precio.tieneInternet && precio.tieneTV ? 'Combo Internet + TV' :
                      precio.tieneInternet ? 'Solo Internet' :
                        precio.tieneTV ? 'Solo Televisión' : 'Sin servicios seleccionados'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  ${precio.totalConIVA.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarServicio(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Eliminar servicio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del servicio */}
            <div className="p-4 space-y-4">
              {/* Selección de servicios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan de Internet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Plan de Internet
                  </label>
                  <select
                    value={servicio.planInternetId}
                    onChange={(e) => actualizarServicio(index, 'planInternetId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin Internet</option>
                    {planesInternet.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} - {plan.velocidad_bajada}MB - ${plan.precio ? plan.precio.toLocaleString() : '0'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan de Televisión */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    Plan de Televisión
                  </label>
                  <select
                    value={servicio.planTelevisionId}
                    onChange={(e) => actualizarServicio(index, 'planTelevisionId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin Televisión</option>
                    {planesTV.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} - {plan.canales_tv} canales - ${plan.precio ? Math.round(plan.precio / 1.19).toLocaleString() : '0'} + IVA
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Información de la sede */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección del Servicio *
                  </label>
                  <input
                    type="text"
                    value={servicio.direccionServicio}
                    onChange={(e) => actualizarServicio(index, 'direccionServicio', e.target.value)}
                    placeholder="Dirección donde se prestará el servicio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Nombre de la Sede
                  </label>
                  <input
                    type="text"
                    value={servicio.nombreSede}
                    onChange={(e) => actualizarServicio(index, 'nombreSede', e.target.value)}
                    placeholder="ej: Sede Principal, Sucursal Norte"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono de la Sede
                  </label>
                  <input
                    type="tel"
                    value={servicio.telefonoSede}
                    onChange={(e) => actualizarServicio(index, 'telefonoSede', e.target.value)}
                    placeholder="Teléfono de contacto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Contacto de la sede */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contacto de la Sede
                </label>
                <input
                  type="text"
                  value={servicio.contactoSede}
                  onChange={(e) => actualizarServicio(index, 'contactoSede', e.target.value)}
                  placeholder="Nombre del contacto en esta sede"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Opciones avanzadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de contrato y permanencia */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de Contrato
                  </label>
                  <select
                    value={servicio.tipoContrato}
                    onChange={(e) => actualizarServicio(index, 'tipoContrato', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="con_permanencia">Con Permanencia (Instalación: ${precio.costoInstalacion ? precio.costoInstalacion.toLocaleString() : '50,000'})</option>
                    <option value="sin_permanencia">Sin Permanencia (Instalación: ${precio.costoInstalacion ? precio.costoInstalacion.toLocaleString() : '150,000'})</option>
                  </select>

                  {servicio.tipoContrato === 'con_permanencia' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Meses de Permanencia
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={servicio.mesesPermanencia}
                        onChange={(e) => actualizarServicio(index, 'mesesPermanencia', parseInt(e.target.value) || 6)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Mínimo requerido: {Math.max(
                          precio.planInternet?.permanencia_minima_meses || 0,
                          precio.planTV?.permanencia_minima_meses || 0
                        ) || 6} meses
                      </p>
                    </div>
                  )}
                </div>

                {/* Precio personalizado */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={servicio.precioPersonalizado}
                      onChange={(e) => actualizarServicio(index, 'precioPersonalizado', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Precio personalizado
                    </span>
                  </label>

                  {servicio.precioPersonalizado && (
                    <div className="space-y-2 ml-6">
                      {servicio.planInternetId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Precio Internet Personalizado (Sin IVA)
                          </label>
                          <input
                            type="number"
                            value={servicio.precioInternetCustom}
                            onChange={(e) => actualizarServicio(index, 'precioInternetCustom', e.target.value)}
                            placeholder="Precio personalizado internet"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      {servicio.planTelevisionId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Precio TV Personalizado (Sin IVA)
                          </label>
                          <input
                            type="number"
                            value={servicio.precioTelevisionCustom}
                            onChange={(e) => actualizarServicio(index, 'precioTelevisionCustom', e.target.value)}
                            placeholder="Precio personalizado TV"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Descuento combo */}
                {servicio.planInternetId && servicio.planTelevisionId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Descuento Combo (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={servicio.descuentoCombo}
                      onChange={(e) => actualizarServicio(index, 'descuentoCombo', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Facturación separada */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={servicio.generarFacturaSeparada}
                    onChange={(e) => actualizarServicio(index, 'generarFacturaSeparada', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Generar factura separada para este servicio
                  </span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Si se marca, este servicio se facturará en una factura independiente
                </p>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={servicio.observaciones}
                  onChange={(e) => actualizarServicio(index, 'observaciones', e.target.value)}
                  rows="2"
                  placeholder="Observaciones específicas para este servicio..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Resumen de precios */}
            <div className="p-4 bg-blue-50 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-blue-600" />
                <h5 className="font-medium text-blue-900">Resumen del Servicio:</h5>
                <span className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded">
                  Estrato {estratoCliente}
                </span>
              </div>

              <div className="text-sm space-y-2">
                {/* Tabla de conceptos */}
                <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-blue-800 border-b border-blue-200 pb-1">
                  <div>Concepto</div>
                  <div className="text-right">Sin IVA</div>
                  <div className="text-right">IVA</div>
                  <div className="text-right">Total</div>
                </div>

                {precio.detalles.map((detalle, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-blue-800">{detalle.concepto}</div>
                    <div className="text-right">${detalle.precioSinIVA.toLocaleString()}</div>
                    <div className="text-right text-green-700">
                      {detalle.valorIVA > 0 ? `$${detalle.valorIVA.toLocaleString()}` : '--'}
                    </div>
                    <div className="text-right font-medium">${detalle.precioConIVA.toLocaleString()}</div>
                  </div>
                ))}

                {/* Total final */}
                <div className="grid grid-cols-4 gap-2 border-t border-blue-300 pt-2 mt-2 font-bold text-blue-900">
                  <div>TOTAL MENSUAL:</div>
                  <div className="text-right">${precio.totalSinIVA.toLocaleString()}</div>
                  <div className="text-right text-green-700">
                    {precio.totalIVA > 0 ? `$${precio.totalIVA.toLocaleString()}` : '--'}
                  </div>
                  <div className="text-right text-lg">${precio.totalConIVA.toLocaleString()}</div>
                </div>

                {/* Información adicional */}
                <div className="mt-3 pt-2 border-t border-blue-200 space-y-1">
                  {precio.esCombo && (
                    <div className="text-xs text-green-700 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Descuento combo aplicado: {servicio.descuentoCombo}%
                    </div>
                  )}

                  {precio.tipoContrato === 'con_permanencia' && (
                    <div className="text-xs text-orange-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Permanencia: {precio.mesesPermanencia} meses
                    </div>
                  )}

                  <div className="text-xs text-gray-600">
                    💡 Instalación: ${precio.costoInstalacion.toLocaleString()} + IVA = ${(precio.costoInstalacion * 1.19).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <div className="font-medium mb-1">Aplicación de IVA:</div>
                    {precio.tieneInternet && (
                      <div>• Internet: {parseInt(estratoCliente) >= 4 ? 'Con IVA 19%' : 'Sin IVA'} (Estrato {estratoCliente})</div>
                    )}
                    {precio.tieneTV && (
                      <div>• Televisión: Con IVA 19% (Normativa)</div>
                    )}
                    <div>• Instalación: Con IVA 19% (Normativa)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Estado vacío */}
      {servicios.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay servicios agregados</h3>
          <p className="text-gray-600 mb-4">
            Agrega al menos un servicio para crear el cliente
          </p>
          <button
            type="button"
            onClick={agregarServicio}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar Primer Servicio
          </button>
        </div>
      )}

      {/* Resumen total */}
      {servicios.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-3">Resumen Total del Cliente:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-green-700">Servicios:</span>
              <div className="font-semibold">{servicios.length}</div>
            </div>
            <div>
              <span className="text-green-700">Con Internet:</span>
              <div className="font-semibold">
                {servicios.filter(s => s.planInternetId).length}
              </div>
            </div>
            <div>
              <span className="text-green-700">Con TV:</span>
              <div className="font-semibold">
                {servicios.filter(s => s.planTelevisionId).length}
              </div>
            </div>
            <div>
              <span className="text-green-700">Total Sin IVA:</span>
              <div className="font-semibold">
                ${servicios.reduce((total, servicio) => total + calcularPrecioServicio(servicio).totalSinIVA, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-green-700">Total Con IVA:</span>
              <div className="font-semibold text-lg">
                ${servicios.reduce((total, servicio) => total + calcularPrecioServicio(servicio).totalConIVA, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Resumen de permanencia */}
          <div className="mt-3 pt-3 border-t border-green-300">
            <div className="text-sm text-green-800">
              <div className="font-medium mb-1">Contratos de Permanencia:</div>
              {servicios.filter(s => s.tipoContrato === 'con_permanencia').length > 0 ? (
                <div>
                  • {servicios.filter(s => s.tipoContrato === 'con_permanencia').length} servicio(s) con permanencia
                  <br />
                  • Instalación total: ${servicios.reduce((total, servicio) => {
                    if (servicio.planInternetId || servicio.planTelevisionId) {
                      const precio = calcularPrecioServicio(servicio);
                      return total + (precio.costoInstalacion * 1.19);
                    }
                    return total;
                  }, 0).toLocaleString()}
                </div>
              ) : (
                <div>• Todos los servicios sin permanencia</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================================
// COMPONENTE PRINCIPAL: ClientsManagement
// ================================================================
const ClientsManagement = () => {
  const { user } = useAuth();
  const {
    clients,
    pagination,
    filters,
    loading,
    error,
    changePage,
    changeLimit,
    applyFilters,
    clearFilters,
    refresh
  } = useClients();

  // Estados del componente
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el nuevo formulario
  const [showNewForm, setShowNewForm] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [estratoCliente, setEstratoCliente] = useState(1);

  // Estados para exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Estados para confirmaciones
  const [showInactivarModal, setShowInactivarModal] = useState(false);
  const [inactivandoCliente, setInactivandoCliente] = useState(false);

  // Permisos del usuario actual
  const permissions = ROLE_PERMISSIONS[user?.role] || ROLE_PERMISSIONS.instalador;

  const [ciudades, setCiudades] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState('');

  // Cargar planes disponibles al montar el componente
  useEffect(() => {
    cargarPlanesDisponibles();
    cargarCiudades();
  }, []);

  const cargarCiudades = async () => {
    try {
      const response = await configService.getCities();
      if (response.success) {
        setCiudades(response.data);
      }
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    }
  };

  const cargarSectoresPorCiudad = async (ciudadId) => {
    try {
      const response = await configService.getSectorsByCity(ciudadId);
      if (response.success) {
        setSectores(response.data);
      }
    } catch (error) {
      console.error('Error cargando sectores:', error);
      setSectores([]);
    }
  };

  const handleCiudadChange = (ciudadId) => {
    setCiudadSeleccionada(ciudadId);
    if (ciudadId) {
      cargarSectoresPorCiudad(ciudadId);
    } else {
      setSectores([]);
    }
  };

  const cargarPlanesDisponibles = async () => {
    try {
      setLoadingPlanes(true);
      const response = await configService.getServicePlans();
      if (response.success) {
        // Filtrar solo planes activos y no combos
        const planesActivos = response.data.filter(plan =>
          plan.activo && plan.tipo !== 'combo'
        );
        setPlanesDisponibles(planesActivos);
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
    } finally {
      setLoadingPlanes(false);
    }
  };

  // Manejar búsqueda
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      applyFilters({ ...filters, nombre: term });
    } else if (term.length === 0) {
      const { nombre, ...restFilters } = filters;
      applyFilters(restFilters);
    }
  };

  // Manejar selección de cliente
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  // Manejar edición de cliente
  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowEditForm(true);
  };

  // Manejar creación de cliente con múltiples servicios
  const handleCreateClientWithServices = () => {
    setServiciosSeleccionados([]);
    setEstratoCliente(1);
    setShowNewForm(true);
  };

  // Manejar guardado de cliente con servicios
  const handleSaveClientWithServices = async (datosCliente) => {
    try {
      if (serviciosSeleccionados.length === 0) {
        alert('Debe agregar al menos un servicio');
        return;
      }

      const datosClienteCompletos = {
        ...datosCliente,
        estrato: estratoCliente,
        // ✅ CAMPOS FALTANTES AGREGADOS
        tipo_documento: datosCliente.tipo_documento || 'cedula',
        barrio: datosCliente.barrio || '',
        ciudad_id: datosCliente.ciudad_id ? parseInt(datosCliente.ciudad_id) : null,
        sector_id: datosCliente.sector_id ? parseInt(datosCliente.sector_id) : null,
        telefono_fijo: datosCliente.telefono_fijo || null
      };

      const response = await clientService.createClientWithServices({
        datosCliente: datosClienteCompletos,
        servicios: serviciosSeleccionados
      });

      if (response.success) {
        refresh();
        setShowNewForm(false);
        setServiciosSeleccionados([]);
        setCiudadSeleccionada(''); // ✅ LIMPIAR CIUDAD
        setSectores([]);
        setEstratoCliente(1);
        if (window.showNotification) {
          window.showNotification('success', 'Cliente creado exitosamente con todos los servicios');
        }
      }
    } catch (error) {
      console.error('Error creando cliente:', error);
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al crear cliente');
      }
    }
  };

  // Manejar inactivación de cliente
  const handleInactivarCliente = (client) => {
    setSelectedClient(client);
    setShowInactivarModal(true);
  };

  // Confirmar inactivación
  const confirmarInactivacion = async (motivo = 'voluntario', observaciones = '') => {
    if (!selectedClient) return;

    try {
      setInactivandoCliente(true);

      const response = await clientService.inactivarCliente(selectedClient.id, {
        motivo_inactivacion: motivo,
        observaciones_inactivacion: observaciones
      });

      if (response.success) {
        if (window.showNotification) {
          window.showNotification('success', 'Cliente inactivado exitosamente');
        }
        refresh();
        setShowInactivarModal(false);
        setShowClientModal(false);
        setSelectedClient(null);
      } else {
        throw new Error(response.message || 'Error al inactivar cliente');
      }
    } catch (error) {
      console.error('Error inactivando cliente:', error);
      if (window.showNotification) {
        window.showNotification('error', error.message || 'Error al inactivar cliente');
      }
    } finally {
      setInactivandoCliente(false);
    }
  };

  // Cerrar formularios
  const handleCloseForm = () => {
    setShowForm(false);
    setShowEditForm(false);
    setShowNewForm(false);
    setSelectedClient(null);
    setServiciosSeleccionados([]);
    setEstratoCliente(1);
  };

  // Manejar cliente guardado
  const handleClientSaved = () => {
    refresh();
    handleCloseForm();
  };

  // Manejar eliminación de cliente
  const handleDeleteClient = async (client) => {
    if (!window.confirm(`¿Está seguro de eliminar el cliente ${client.nombre}?`)) {
      return;
    }

    try {
      const response = await clientService.deleteClient(client.id);
      if (response.success) {
        refresh();
        if (window.showNotification) {
          window.showNotification('success', 'Cliente eliminado exitosamente');
        }
      }
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      if (window.showNotification) {
        window.showNotification('error', 'Error al eliminar cliente');
      }
    }
  };

  // Render del componente principal
  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <ClientStats />

      {/* Barra de herramientas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Toggle vista inactivos */}
            <button
              onClick={() => setShowInactivos(!showInactivos)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${showInactivos
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <UserX className="w-4 h-4 mr-1 inline" />
              {showInactivos ? 'Ver Activos' : 'Ver Inactivos'}
            </button>

            {/* Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${showFilters
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Filter className="w-4 h-4 mr-1 inline" />
              Filtros
            </button>

            {/* Refrescar */}
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 inline ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </button>

            {/* Exportar */}
            {permissions.canExport && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Download className="w-4 h-4 mr-1 inline" />
                  Exportar
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                    <button
                      onClick={() => {/* Lógica de exportar Excel */ }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Exportar a Excel
                    </button>
                    <button
                      onClick={() => {/* Lógica de exportar PDF */ }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Exportar a PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Crear cliente */}
            {permissions.canCreate && (
              <button
                onClick={handleCreateClientWithServices}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            )}
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ClientFilters
              filters={filters}
              onFiltersChange={applyFilters}
              onClearFilters={clearFilters}
            />
          </div>
        )}
      </div>

      {/* Contenido principal */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {showInactivos ? (
        <ClientesInactivos />
      ) : (
        <ClientsList
          clients={clients}
          pagination={pagination}
          loading={loading}
          onClientSelect={handleClientSelect}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
          onInactivarCliente={handleInactivarCliente}
          onPageChange={changePage}
          onLimitChange={changeLimit}
          permissions={permissions}
        />
      )}

      {/* Modal de cliente */}
      {showClientModal && selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => {
            setShowClientModal(false);
            setSelectedClient(null);
          }}
          onEdit={() => {
            setShowClientModal(false);
            handleEditClient(selectedClient);
          }}
          onInactivar={() => handleInactivarCliente(selectedClient)}
          onDelete={handleDeleteClient}
          permissions={permissions}
        />
      )}

      {/* Formulario de edición de cliente */}
      {showEditForm && selectedClient && (
        <ClientEditForm
          client={selectedClient}
          onClose={handleCloseForm}
          onSave={handleClientSaved}
        />
      )}

      {/* Formulario de creación con múltiples servicios */}
      {showNewForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Crear Nuevo Cliente con Servicios
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const datosCliente = Object.fromEntries(formData.entries());
              handleSaveClientWithServices(datosCliente);
            }}>
              {/* Datos del cliente */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Información del Cliente
                </h4>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Documento *
                    </label>
                    <select
                      name="tipo_documento"
                      defaultValue="cedula"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cedula">Cédula de Ciudadanía</option>
                      <option value="nit">NIT</option>
                      <option value="pasaporte">Pasaporte</option>
                      <option value="extranjeria">Cédula de Extranjería</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Identificación *
                    </label>
                    <input
                      type="text"
                      name="identificacion"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono Fijo
                    </label>
                    <input
                      type="tel"
                      name="telefono_fijo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estrato *
                    </label>
                    <select
                      name="estrato"
                      value={estratoCliente}
                      onChange={(e) => setEstratoCliente(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">Estrato 1 (Internet sin IVA)</option>
                      <option value="2">Estrato 2 (Internet sin IVA)</option>
                      <option value="3">Estrato 3 (Internet sin IVA)</option>
                      <option value="4">Estrato 4 (Internet con IVA 19%)</option>
                      <option value="5">Estrato 5 (Internet con IVA 19%)</option>
                      <option value="6">Estrato 6 (Internet con IVA 19%)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      El estrato determina la aplicación del IVA en servicios de Internet
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciudad *
                    </label>
                    <select
                      name="ciudad_id"
                      value={ciudadSeleccionada}
                      onChange={(e) => handleCiudadChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione una ciudad</option>
                      {ciudades.map(ciudad => (
                        <option key={ciudad.id} value={ciudad.id}>
                          {ciudad.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ SECTOR - CAMPO NUEVO */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sector *
                    </label>
                    <select
                      name="sector_id"
                      required
                      disabled={!ciudadSeleccionada || sectores.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Seleccione un sector</option>
                      {sectores.map(sector => (
                        <option key={sector.id} value={sector.id}>
                          {sector.codigo} - {sector.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ✅ DIRECCIÓN Y BARRIO - CAMPOS NUEVOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección Principal *
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* ✅ BARRIO - CAMPO NUEVO */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barrio *
                    </label>
                    <input
                      type="text"
                      name="barrio"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selector de servicios */}
              <div className="mb-8">
                {loadingPlanes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Cargando planes disponibles...</span>
                  </div>
                ) : (
                  <ServiciosSelector
                    serviciosSeleccionados={serviciosSeleccionados}
                    onServiciosChange={setServiciosSeleccionados}
                    planesDisponibles={planesDisponibles}
                    estratoCliente={estratoCliente}
                  />
                )}
              </div>

              {/* Opciones adicionales */}
              <div className="mb-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  Opciones Adicionales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="generar_documentos"
                      defaultChecked
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Generar contratos automáticamente</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="enviar_bienvenida"
                      defaultChecked
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Enviar email de bienvenida</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="programar_instalacion"
                      defaultChecked
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Programar instalación</span>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={serviciosSeleccionados.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Crear Cliente y Servicios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para inactivar */}
      {showInactivarModal && selectedClient && (
        <ModalInactivarCliente
          client={selectedClient}
          onConfirm={confirmarInactivacion}
          onCancel={() => {
            setShowInactivarModal(false);
            setSelectedClient(null);
          }}
          loading={inactivandoCliente}
        />
      )}
    </div>
  );
};

// ================================================================
// COMPONENTE: Modal para confirmar inactivación
// ================================================================
const ModalInactivarCliente = ({ client, onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState('voluntario');
  const [observaciones, setObservaciones] = useState('');

  const handleConfirm = () => {
    onConfirm(motivo, observaciones);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">
              Inactivar Cliente
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            ¿Está seguro de inactivar al cliente <strong>{client.nombre}</strong>?
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de inactivación
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="voluntario">Retiro voluntario</option>
                <option value="mora">Mora prolongada</option>
                <option value="incumplimiento">Incumplimiento contrato</option>
                <option value="mudanza">Mudanza fuera de cobertura</option>
                <option value="otro">Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Inactivar Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsManagement;