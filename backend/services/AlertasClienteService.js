// backend/services/AlertasClienteService.js
// Crear este archivo nuevo

const Database = require('../config/database');

class AlertasClienteService {

  /**
   * Verificar si cliente ya existe y devolver información completa
   * ✅ MODIFICADO: Ahora muestra TODAS las ubicaciones del cliente
   */
  static async verificarClienteExistente(identificacion, tipoDocumento = 'cedula') {
    try {
      const conexion = await Database.getConnection();

      // 1. Buscar TODOS los clientes con esta identificación (múltiples ubicaciones)
      const [clientes] = await conexion.execute(`
        SELECT
          c.*,
          dep.nombre as departamento_nombre,
          ciu.nombre as ciudad_nombre,
          s.nombre as sector_nombre
        FROM clientes c
        LEFT JOIN ciudades ciu ON c.ciudad_id = ciu.id
        LEFT JOIN departamentos dep ON ciu.departamento_id = dep.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE c.identificacion = ? AND c.tipo_documento = ?
        ORDER BY c.created_at DESC
      `, [identificacion, tipoDocumento]);

      if (clientes.length === 0) {
        conexion.release();
        return {
          existe: false,
          clientes: [],
          ubicaciones: [],
          servicios_totales: [],
          alertas: []
        };
      }

      // ✅ NUEVO: Procesar todas las ubicaciones del cliente
      const ubicaciones = [];
      const serviciosTotales = [];
      let facturasPendientesTotales = { total_pendientes: 0, valor_pendiente: 0 };
      let contratosTotales = [];

      // Iterar sobre cada ubicación del cliente
      for (const ubicacion of clientes) {
        // Obtener servicios de esta ubicación
        const [servicios] = await conexion.execute(`
          SELECT
            sc.*,
            ps.nombre as plan_nombre,
            ps.tipo as tipo_servicio,
            ps.precio as precio_plan,
            ps.descripcion as plan_descripcion,
            ps.velocidad_bajada,
            ps.velocidad_subida
          FROM servicios_cliente sc
          INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.cliente_id = ?
          ORDER BY sc.created_at DESC
        `, [ubicacion.id]);

        // Obtener facturas pendientes de esta ubicación
        const [facturasPendientes] = await conexion.execute(`
          SELECT
            COUNT(*) as total_pendientes,
            COALESCE(SUM(total), 0) as valor_pendiente,
            MIN(fecha_vencimiento) as fecha_vencimiento_mas_antigua
          FROM facturas
          WHERE cliente_id = ? AND estado IN ('pendiente', 'vencida')
        `, [ubicacion.id]);

        // Obtener contratos de esta ubicación
        const [contratos] = await conexion.execute(`
          SELECT
            numero_contrato,
            tipo_permanencia,
            permanencia_meses,
            fecha_vencimiento_permanencia,
            estado,
            created_at
          FROM contratos
          WHERE cliente_id = ? AND estado = 'activo'
          ORDER BY created_at DESC
        `, [ubicacion.id]);

        // Agregar a totales
        serviciosTotales.push(...servicios);
        contratosTotales.push(...contratos);
        facturasPendientesTotales.total_pendientes += facturasPendientes[0].total_pendientes || 0;
        facturasPendientesTotales.valor_pendiente += parseFloat(facturasPendientes[0].valor_pendiente) || 0;

        // Guardar información de esta ubicación
        ubicaciones.push({
          id: ubicacion.id,
          direccion: ubicacion.direccion,
          barrio: ubicacion.barrio,
          ciudad: ubicacion.ciudad_nombre,
          departamento: ubicacion.departamento_nombre,
          sector: ubicacion.sector_nombre,
          estado: ubicacion.estado,
          fecha_registro: ubicacion.fecha_registro,
          servicios: servicios,
          facturas_pendientes: facturasPendientes[0],
          contratos: contratos
        });
      }

      // Ordenar por fecha de vencimiento más antigua
      if (facturasPendientesTotales.total_pendientes > 0) {
        const [fechaMasAntigua] = await conexion.execute(`
          SELECT MIN(fecha_vencimiento) as fecha_vencimiento_mas_antigua
          FROM facturas
          WHERE cliente_id IN (${clientes.map(() => '?').join(',')})
            AND estado IN ('pendiente', 'vencida')
        `, clientes.map(c => c.id));

        facturasPendientesTotales.fecha_vencimiento_mas_antigua = fechaMasAntigua[0]?.fecha_vencimiento_mas_antigua;
      }

      // Generar alertas considerando TODAS las ubicaciones
      const alertas = this.generarAlertasMultiplesUbicaciones(
        clientes[0], // ✅ CORREGIDO: usar clientes[0] en lugar de cliente
        ubicaciones,
        serviciosTotales,
        facturasPendientesTotales,
        contratosTotales
      );

      conexion.release();

      return {
        existe: true,
        total_ubicaciones: clientes.length,
        cliente: {
          identificacion: clientes[0].identificacion,
          tipo_documento: clientes[0].tipo_documento,
          nombre: clientes[0].nombre
        },
        ubicaciones: ubicaciones,
        servicios_totales: serviciosTotales,
        facturas_pendientes_totales: facturasPendientesTotales,
        contratos_totales: contratosTotales,
        alertas: alertas
      };

    } catch (error) {
      console.error('❌ Error verificando cliente existente:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Generar alertas para clientes con múltiples ubicaciones
   */
  static generarAlertasMultiplesUbicaciones(cliente, ubicaciones, serviciosTotales, facturasPendientes, contratos) {
    const alertas = [];

    // Alerta 1: Cliente con múltiples ubicaciones
    alertas.push({
      tipo: 'info',
      titulo: `Cliente con ${ubicaciones.length} ubicación(es) registrada(s)`,
      mensaje: `El cliente ${cliente.nombre} (${cliente.identificacion}) tiene servicios en ${ubicaciones.length} dirección(es) diferente(s).`,
      icono: 'map-pin',
      accion: 'Puede agregar servicios en una nueva dirección o en una existente.',
      ubicaciones: ubicaciones.map(u => ({
        direccion: u.direccion,
        ciudad: u.ciudad,
        barrio: u.barrio,
        servicios_activos: u.servicios.filter(s => s.estado === 'activo').length
      }))
    });

    // Alerta 2: Servicios totales
    if (serviciosTotales && serviciosTotales.length > 0) {
      const serviciosActivos = serviciosTotales.filter(s => s.estado === 'activo');
      const serviciosInactivos = serviciosTotales.filter(s => s.estado !== 'activo');

      if (serviciosActivos.length > 0) {
        alertas.push({
          tipo: 'warning',
          titulo: `${serviciosActivos.length} servicio(s) activo(s) en total`,
          mensaje: `Este cliente tiene servicios activos distribuidos en ${ubicaciones.length} ubicación(es).`,
          icono: 'wifi',
          accion: 'Revise las ubicaciones existentes antes de agregar nuevos servicios.',
          detalles: serviciosActivos
        });
      }

      if (serviciosInactivos.length > 0) {
        alertas.push({
          tipo: 'info',
          titulo: `${serviciosInactivos.length} servicio(s) inactivo(s)`,
          mensaje: `El cliente tiene servicios inactivos que podrían reactivarse.`,
          icono: 'refresh',
          detalles: serviciosInactivos
        });
      }
    }

    // Alerta 3: Facturas pendientes totales
    if (facturasPendientes && facturasPendientes.total_pendientes > 0) {
      const esMora = facturasPendientes.fecha_vencimiento_mas_antigua &&
                    new Date(facturasPendientes.fecha_vencimiento_mas_antigua) < new Date();

      alertas.push({
        tipo: esMora ? 'error' : 'warning',
        titulo: `${facturasPendientes.total_pendientes} factura(s) pendiente(s) en todas las ubicaciones`,
        mensaje: `Valor pendiente total: $${Math.round(facturasPendientes.valor_pendiente).toLocaleString()}${esMora ? ' - EN MORA' : ''}`,
        icono: 'credit-card',
        accion: 'Considere gestionar el pago antes de agregar nuevos servicios.',
        detalles: facturasPendientes
      });
    }

    // Alerta 4: Contratos con permanencia
    const contratosConPermanencia = contratos.filter(c =>
      c.tipo_permanencia === 'con_permanencia' &&
      c.fecha_vencimiento_permanencia &&
      new Date(c.fecha_vencimiento_permanencia) > new Date()
    );

    if (contratosConPermanencia.length > 0) {
      alertas.push({
        tipo: 'info',
        titulo: `${contratosConPermanencia.length} contrato(s) con permanencia vigente`,
        mensaje: `El cliente tiene contratos con permanencia en diferentes ubicaciones.`,
        icono: 'file-text',
        detalles: contratosConPermanencia
      });
    }

    return alertas;
  }

  /**
   * Generar alertas basadas en la información del cliente (versión antigua, mantener para compatibilidad)
   */
  static generarAlertas(cliente, servicios, facturasPendientes, contratos) {
    const alertas = [];

    // Alerta 1: Cliente ya registrado
    alertas.push({
      tipo: 'info',
      titulo: 'Cliente ya registrado',
      mensaje: `El cliente ${cliente.nombre} (${cliente.identificacion}) ya está registrado en el sistema.`,
      icono: 'info',
      accion: 'Puede agregar servicios adicionales a este cliente existente.'
    });

    // Alerta 2: Servicios existentes
    if (servicios && servicios.length > 0) {
      const serviciosActivos = servicios.filter(s => s.estado === 'activo');
      const serviciosInactivos = servicios.filter(s => s.estado !== 'activo');

      if (serviciosActivos.length > 0) {
        alertas.push({
          tipo: 'warning',
          titulo: `${serviciosActivos.length} servicio(s) activo(s)`,
          mensaje: `Este cliente ya tiene servicios activos: ${serviciosActivos.map(s => s.plan_nombre).join(', ')}.`,
          icono: 'wifi',
          accion: 'Revise los servicios existentes antes de agregar nuevos.',
          detalles: serviciosActivos
        });
      }

      if (serviciosInactivos.length > 0) {
        alertas.push({
          tipo: 'info',
          titulo: `${serviciosInactivos.length} servicio(s) inactivo(s)`,
          mensaje: `El cliente tiene servicios inactivos que podrían reactivarse.`,
          icono: 'refresh',
          detalles: serviciosInactivos
        });
      }
    }

    // Alerta 3: Facturas pendientes
    if (facturasPendientes && facturasPendientes.total_pendientes > 0) {
      const esMora = new Date(facturasPendientes.fecha_vencimiento_mas_antigua) < new Date();
      
      alertas.push({
        tipo: esMora ? 'error' : 'warning',
        titulo: `${facturasPendientes.total_pendientes} factura(s) pendiente(s)`,
        mensaje: `Valor pendiente: $${facturasPendientes.valor_pendiente?.toLocaleString() || 0}${esMora ? ' - EN MORA' : ''}`,
        icono: 'credit-card',
        accion: 'Considere gestionar el pago antes de agregar nuevos servicios.',
        detalles: facturasPendientes
      });
    }

    // Alerta 4: Contratos con permanencia
    const contratosConPermanencia = contratos.filter(c => 
      c.tipo_permanencia === 'con_permanencia' && 
      c.fecha_vencimiento_permanencia && 
      new Date(c.fecha_vencimiento_permanencia) > new Date()
    );

    if (contratosConPermanencia.length > 0) {
      alertas.push({
        tipo: 'info',
        titulo: 'Contrato con permanencia vigente',
        mensaje: `El cliente tiene contratos con permanencia hasta ${new Date(contratosConPermanencia[0].fecha_vencimiento_permanencia).toLocaleDateString()}.`,
        icono: 'file-text',
        detalles: contratosConPermanencia
      });
    }

    // Alerta 5: Estado del cliente
    if (cliente.estado !== 'activo') {
      alertas.push({
        tipo: 'error',
        titulo: 'Cliente inactivo',
        mensaje: `El estado del cliente es: ${cliente.estado}. Debe activarlo antes de agregar servicios.`,
        icono: 'alert-triangle',
        accion: 'Verificar motivo de inactivación y reactivar si es necesario.'
      });
    }

    return alertas;
  }
}

module.exports = AlertasClienteService;