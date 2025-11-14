// backend/utils/clienteExistenteHelper.js
// Utilidad para buscar y mostrar información completa de clientes existentes

const pool = require('../config/database');

/**
 * Busca todos los clientes que coincidan con una identificación
 * @param {string} identificacion - Número de identificación a buscar
 * @returns {Promise<Array>} Array con todos los clientes encontrados con información completa
 */
async function buscarClientesPorIdentificacion(identificacion) {
  try {
    const query = `
      SELECT
        c.id,
        c.identificacion,
        c.tipo_documento,
        c.nombre,
        c.direccion,
        c.barrio,
        c.sector_id,
        s.nombre as sector_nombre,
        c.estrato,
        c.ciudad_id,
        ciudad.nombre as ciudad_nombre,
        dept.nombre as departamento_nombre,
        c.telefono,
        c.telefono_2,
        c.correo,
        c.estado,
        c.fecha_registro,
        c.codigo_usuario,
        c.observaciones,
        -- Contar servicios activos
        (SELECT COUNT(*) FROM servicios_cliente sc
         WHERE sc.cliente_id = c.id AND sc.estado = 'activo') as servicios_activos,
        -- Obtener servicios
        (SELECT GROUP_CONCAT(
           CONCAT(ps.nombre, ' (', sc.estado, ')')
           SEPARATOR ', '
         )
         FROM servicios_cliente sc
         JOIN planes_servicio ps ON sc.plan_id = ps.id
         WHERE sc.cliente_id = c.id
        ) as servicios_detalle,
        -- Contar facturas
        (SELECT COUNT(*) FROM facturas f WHERE f.cliente_id = c.id) as total_facturas,
        -- Última factura
        (SELECT MAX(fecha_emision) FROM facturas f WHERE f.cliente_id = c.id) as ultima_factura,
        -- Saldo pendiente
        (SELECT COALESCE(SUM(saldo), 0) FROM facturas f
         WHERE f.cliente_id = c.id AND f.estado IN ('pendiente', 'vencida')) as saldo_pendiente
      FROM clientes c
      LEFT JOIN sectores s ON c.sector_id = s.id
      LEFT JOIN ciudades ciudad ON c.ciudad_id = ciudad.id
      LEFT JOIN departamentos dept ON ciudad.departamento_id = dept.id
      WHERE c.identificacion = ?
      ORDER BY c.id DESC
    `;

    const [clientes] = await pool.execute(query, [identificacion]);
    return clientes;
  } catch (error) {
    console.error('Error al buscar clientes por identificación:', error);
    throw error;
  }
}

/**
 * Genera un mensaje descriptivo con la información de clientes existentes
 * @param {string} identificacion - Número de identificación
 * @returns {Promise<Object>} Objeto con mensaje y datos de clientes
 */
async function generarMensajeClienteExistente(identificacion) {
  const clientes = await buscarClientesPorIdentificacion(identificacion);

  if (clientes.length === 0) {
    return {
      existe: false,
      mensaje: null,
      clientes: []
    };
  }

  // Generar mensaje descriptivo
  let mensaje = `Ya existe${clientes.length > 1 ? 'n' : ''} ${clientes.length} cliente${clientes.length > 1 ? 's' : ''} con la identificación ${identificacion}:\n\n`;

  clientes.forEach((cliente, index) => {
    mensaje += `📋 Cliente #${index + 1}:\n`;
    mensaje += `   • ID: ${cliente.id}\n`;
    mensaje += `   • Nombre: ${cliente.nombre}\n`;
    mensaje += `   • Dirección: ${cliente.direccion}`;
    if (cliente.barrio) mensaje += ` - ${cliente.barrio}`;
    mensaje += `\n`;
    mensaje += `   • Ciudad: ${cliente.ciudad_nombre || 'N/A'}, ${cliente.departamento_nombre || 'N/A'}\n`;
    if (cliente.sector_nombre) mensaje += `   • Sector: ${cliente.sector_nombre}\n`;
    mensaje += `   • Teléfono: ${cliente.telefono || 'N/A'}`;
    if (cliente.telefono_2) mensaje += ` / ${cliente.telefono_2}`;
    mensaje += `\n`;
    mensaje += `   • Email: ${cliente.correo || 'N/A'}\n`;
    mensaje += `   • Estado: ${cliente.estado.toUpperCase()}\n`;
    mensaje += `   • Código Usuario: ${cliente.codigo_usuario || 'N/A'}\n`;
    mensaje += `   • Servicios Activos: ${cliente.servicios_activos}\n`;
    if (cliente.servicios_detalle) {
      mensaje += `   • Detalle Servicios: ${cliente.servicios_detalle}\n`;
    }
    mensaje += `   • Total Facturas: ${cliente.total_facturas}\n`;
    if (cliente.saldo_pendiente > 0) {
      mensaje += `   • Saldo Pendiente: $${Number(cliente.saldo_pendiente).toLocaleString('es-CO')}\n`;
    }
    mensaje += `   • Fecha Registro: ${cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString('es-CO') : 'N/A'}\n`;
    if (cliente.observaciones) {
      mensaje += `   • Observaciones: ${cliente.observaciones}\n`;
    }
    mensaje += `\n`;
  });

  mensaje += `\n💡 Nota: Según la configuración actual, se permite crear el mismo cliente en diferentes ubicaciones.`;
  mensaje += `\nSi deseas agregar un servicio a un cliente existente, utiliza la función de "Agregar Servicio" en lugar de crear un nuevo cliente.`;

  return {
    existe: true,
    mensaje,
    clientes
  };
}

/**
 * Verifica si un cliente existe y retorna información detallada
 * Útil para endpoints que necesitan validar antes de crear
 * @param {string} identificacion - Número de identificación
 * @param {string} direccion - Dirección del cliente (opcional para comparación)
 * @returns {Promise<Object>} Información del cliente existente
 */
async function verificarClienteExistente(identificacion, direccion = null) {
  const clientes = await buscarClientesPorIdentificacion(identificacion);

  if (clientes.length === 0) {
    return {
      existe: false,
      clienteExacto: null,
      clientesSimilares: []
    };
  }

  // Si se proporciona dirección, buscar coincidencia exacta
  let clienteExacto = null;
  if (direccion) {
    clienteExacto = clientes.find(c =>
      c.direccion.toLowerCase().trim() === direccion.toLowerCase().trim()
    );
  }

  return {
    existe: true,
    clienteExacto,
    clientesSimilares: clientes,
    totalClientes: clientes.length
  };
}

/**
 * Genera respuesta de error HTTP con información completa del cliente
 * @param {string} identificacion - Número de identificación
 * @returns {Promise<Object>} Respuesta HTTP lista para enviar
 */
async function generarRespuestaErrorDuplicado(identificacion) {
  const info = await generarMensajeClienteExistente(identificacion);

  if (!info.existe) {
    return {
      statusCode: 500,
      response: {
        success: false,
        message: 'Error al verificar cliente existente'
      }
    };
  }

  return {
    statusCode: 409,
    response: {
      success: false,
      error: 'CLIENTE_DUPLICADO',
      message: `Ya existe${info.clientes.length > 1 ? 'n' : ''} ${info.clientes.length} cliente${info.clientes.length > 1 ? 's' : ''} con esta identificación`,
      detalle: info.mensaje,
      clientes_existentes: info.clientes.map(c => ({
        id: c.id,
        nombre: c.nombre,
        direccion: c.direccion,
        barrio: c.barrio,
        ciudad: c.ciudad_nombre,
        telefono: c.telefono,
        correo: c.correo,
        estado: c.estado,
        codigo_usuario: c.codigo_usuario,
        servicios_activos: c.servicios_activos,
        servicios_detalle: c.servicios_detalle,
        saldo_pendiente: c.saldo_pendiente
      })),
      sugerencia: info.clientes.length === 1
        ? 'Si deseas agregar un servicio a este cliente, usa la función "Agregar Servicio" en lugar de crear un nuevo cliente.'
        : 'Este cliente ya tiene múltiples ubicaciones registradas. Verifica si alguna coincide con la que intentas crear.'
    }
  };
}

module.exports = {
  buscarClientesPorIdentificacion,
  generarMensajeClienteExistente,
  verificarClienteExistente,
  generarRespuestaErrorDuplicado
};
