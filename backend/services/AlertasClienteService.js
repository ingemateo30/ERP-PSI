// backend/services/AlertasClienteService.js
// Crear este archivo nuevo

const Database = require('../config/database');

class AlertasClienteService {

  /**
   * Verificar si cliente ya existe y devolver información completa
   */
  static async verificarClienteExistente(identificacion, tipoDocumento = 'cedula') {
    try {
      const conexion = await Database.getConnection();

      // 1. Buscar cliente por identificación
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
      `, [identificacion, tipoDocumento]);

      if (clientes.length === 0) {
        conexion.release();
        return {
          existe: false,
          cliente: null,
          servicios: [],
          alertas: []
        };
      }

      const cliente = clientes[0];

      // 2. Obtener servicios activos del cliente
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
      `, [cliente.id]);

      // 3. Obtener facturas pendientes
      const [facturasPendientes] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_pendientes,
          SUM(total) as valor_pendiente,
          MIN(fecha_vencimiento) as fecha_vencimiento_mas_antigua
        FROM facturas 
        WHERE cliente_id = ? AND estado IN ('pendiente', 'vencida')
      `, [cliente.id]);

      // 4. Obtener contratos activos
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
      `, [cliente.id]);

      // 5. Generar alertas contextuales
      const alertas = this.generarAlertas(cliente, servicios, facturasPendientes[0], contratos);

      conexion.release();

      return {
        existe: true,
        cliente: {
          ...cliente,
          departamento_nombre: cliente.departamento_nombre,
          ciudad_nombre: cliente.ciudad_nombre,
          sector_nombre: cliente.sector_nombre
        },
        servicios: servicios,
        facturas_pendientes: facturasPendientes[0],
        contratos: contratos,
        alertas: alertas
      };

    } catch (error) {
      console.error('❌ Error verificando cliente existente:', error);
      throw error;
    }
  }

  /**
   * Generar alertas basadas en la información del cliente
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