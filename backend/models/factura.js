const pool = require('../config/database');

class Factura {
  // Obtener todas las facturas con filtros
  static async obtenerTodas(filtros = {}) {
    try {
      let query = `
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.direccion as cliente_direccion,
          c.telefono as cliente_telefono,
          c.correo as cliente_correo,
          c.sector_id,
          s.nombre as sector_nombre,
          b.nombre as banco_nombre,
          u.nombre as creado_por_nombre
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN bancos b ON f.banco_id = b.id
        LEFT JOIN sistema_usuarios u ON f.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Filtros dinámicos
      if (filtros.estado) {
        query += ' AND f.estado = ?';
        params.push(filtros.estado);
      }
      
      if (filtros.numero_factura) {
        query += ' AND f.numero_factura LIKE ?';
        params.push(`%${filtros.numero_factura}%`);
      }
      
      if (filtros.identificacion_cliente) {
        query += ' AND f.identificacion_cliente LIKE ?';
        params.push(`%${filtros.identificacion_cliente}%`);
      }
      
      if (filtros.nombre_cliente) {
        query += ' AND f.nombre_cliente LIKE ?';
        params.push(`%${filtros.nombre_cliente}%`);
      }
      
      if (filtros.periodo_facturacion) {
        query += ' AND f.periodo_facturacion = ?';
        params.push(filtros.periodo_facturacion);
      }
      
      if (filtros.fecha_desde) {
        query += ' AND f.fecha_emision >= ?';
        params.push(filtros.fecha_desde);
      }
      
      if (filtros.fecha_hasta) {
        query += ' AND f.fecha_emision <= ?';
        params.push(filtros.fecha_hasta);
      }
      
      if (filtros.vencidas === 'true') {
        query += ' AND f.estado = "pendiente" AND f.fecha_vencimiento < CURDATE()';
      }
      
      if (filtros.ruta) {
        query += ' AND f.ruta = ?';
        params.push(filtros.ruta);
      }
      
      query += ' ORDER BY f.created_at DESC';
      
      // Paginación
      if (filtros.limite && filtros.offset !== undefined) {
      const limitNum = parseInt(filtros.limite) || 10;
      const offset = parseInt(filtros.offset) || 0;

      query += ` ORDER BY ${sortColumnSafe} ${sortDirectionSafe} LIMIT ${limitNum} OFFSET ${offset}`;
    }
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error al obtener facturas: ${error.message}`);
    }
  }

  // Contar total de facturas con filtros
  static async contarTotal(filtros = {}) {
    try {
      let query = 'SELECT COUNT(*) as total FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id WHERE 1=1';
      const params = [];
      
      if (filtros.estado) {
        query += ' AND f.estado = ?';
        params.push(filtros.estado);
      }
      
      if (filtros.numero_factura) {
        query += ' AND f.numero_factura LIKE ?';
        params.push(`%${filtros.numero_factura}%`);
      }
      
      if (filtros.identificacion_cliente) {
        query += ' AND f.identificacion_cliente LIKE ?';
        params.push(`%${filtros.identificacion_cliente}%`);
      }
      
      if (filtros.nombre_cliente) {
        query += ' AND f.nombre_cliente LIKE ?';
        params.push(`%${filtros.nombre_cliente}%`);
      }
      
      if (filtros.periodo_facturacion) {
        query += ' AND f.periodo_facturacion = ?';
        params.push(filtros.periodo_facturacion);
      }
      
      if (filtros.fecha_desde) {
        query += ' AND f.fecha_emision >= ?';
        params.push(filtros.fecha_desde);
      }
      
      if (filtros.fecha_hasta) {
        query += ' AND f.fecha_emision <= ?';
        params.push(filtros.fecha_hasta);
      }
      
      if (filtros.vencidas === 'true') {
        query += ' AND f.estado = "pendiente" AND f.fecha_vencimiento < CURDATE()';
      }
      
      if (filtros.ruta) {
        query += ' AND f.ruta = ?';
        params.push(filtros.ruta);
      }
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas[0].total;
    } catch (error) {
      throw new Error(`Error al contar facturas: ${error.message}`);
    }
  }

  // Obtener factura por ID
  static async obtenerPorId(id) {
    try {
      const query = `
        SELECT
          f.*,
          c.nombre as cliente_nombre,
          c.direccion as cliente_direccion,
          c.telefono as cliente_telefono,
          c.correo as cliente_correo,
          c.sector_id,
          s.nombre as sector_nombre,
          s.codigo as sector_codigo,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          b.nombre as banco_nombre,
          u.nombre as creado_por_nombre
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        LEFT JOIN bancos b ON f.banco_id = b.id
        LEFT JOIN sistema_usuarios u ON f.created_by = u.id
        WHERE f.id = ?
      `;

      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [id]);

      if (filas.length === 0) {
        connection.release();
        return null;
      }

      const factura = filas[0];

      // ✅ Obtener los detalles de la factura (detalle_facturas)
      const queryDetalles = `
        SELECT
          df.*,
          cf.nombre as concepto_nombre_completo,
          cf.tipo as concepto_tipo
        FROM detalle_facturas df
        LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
        WHERE df.factura_id = ?
        ORDER BY df.id
      `;

      const [detalles] = await connection.execute(queryDetalles, [id]);
      connection.release();

      // ✅ Agregar los detalles a la factura
      factura.detalles = detalles;

      return factura;
    } catch (error) {
      throw new Error(`Error al obtener factura: ${error.message}`);
    }
  }

  // Obtener factura por número
  static async obtenerPorNumero(numeroFactura) {
    try {
      const query = `
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.direccion as cliente_direccion,
          c.telefono as cliente_telefono,
          c.correo as cliente_correo
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE f.numero_factura = ?
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [numeroFactura]);
      connection.release();
      
      return filas[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar factura por número: ${error.message}`);
    }
  }

  // Generar siguiente número de factura
  static async generarNumeroFactura() {
    try {
      const connection = await pool.getConnection();
      
      // Obtener configuración de la empresa
      const [config] = await connection.execute(
        'SELECT prefijo_factura, consecutivo_factura FROM configuracion_empresa WHERE id = 1'
      );
      
      if (!config[0]) {
        throw new Error('Configuración de empresa no encontrada');
      }
      
      const { prefijo_factura, consecutivo_factura } = config[0];
      const numeroFactura = `${prefijo_factura}${String(consecutivo_factura).padStart(6, '0')}`;
      
      // Actualizar consecutivo
      await connection.execute(
        'UPDATE configuracion_empresa SET consecutivo_factura = consecutivo_factura + 1 WHERE id = 1'
      );
      
      connection.release();
      return numeroFactura;
    } catch (error) {
      throw new Error(`Error al generar número de factura: ${error.message}`);
    }
  }

  // Crear nueva factura
  static async crear(datosFactura) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Generar número de factura si no se proporciona
      let numeroFactura = datosFactura.numero_factura;
      if (!numeroFactura) {
        // Obtener configuración
        const [config] = await connection.execute(
          'SELECT prefijo_factura, consecutivo_factura FROM configuracion_empresa WHERE id = 1'
        );
        
        if (!config[0]) {
          throw new Error('Configuración de empresa no encontrada');
        }
        
        const { prefijo_factura, consecutivo_factura } = config[0];
        numeroFactura = `${prefijo_factura}${String(consecutivo_factura).padStart(6, '0')}`;
        
        // Actualizar consecutivo
        await connection.execute(
          'UPDATE configuracion_empresa SET consecutivo_factura = consecutivo_factura + 1 WHERE id = 1'
        );
      }

      // Verificar que no exista el número de factura
      const [existente] = await connection.execute(
        'SELECT id FROM facturas WHERE numero_factura = ?',
        [numeroFactura]
      );
      
      if (existente.length > 0) {
        throw new Error('El número de factura ya existe');
      }

      // Obtener datos del cliente
      const [cliente] = await connection.execute(
        'SELECT identificacion, nombre FROM clientes WHERE id = ?',
        [datosFactura.cliente_id]
      );
      
      if (!cliente[0]) {
        throw new Error('Cliente no encontrado');
      }

      // Calcular totales
      const subtotal = (datosFactura.s_internet || 0) + 
                     (datosFactura.s_television || 0) + 
                     (datosFactura.s_interes || 0) + 
                     (datosFactura.s_reconexion || 0) + 
                     (datosFactura.s_descuento || 0) + 
                     (datosFactura.s_varios || 0) + 
                     (datosFactura.s_publicidad || 0);

      const iva = datosFactura.s_iva || 0;
      const total = subtotal + iva + (datosFactura.saldo_anterior || 0);

      const query = `
        INSERT INTO facturas (
          numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
          periodo_facturacion, fecha_emision, fecha_vencimiento, fecha_desde, fecha_hasta,
          internet, television, saldo_anterior, interes, reconexion, descuento, varios, publicidad,
          s_internet, s_television, s_interes, s_reconexion, s_descuento, s_varios, s_publicidad, s_iva,
          subtotal, iva, total, estado, ruta, resolucion, observaciones, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const valores = [
        numeroFactura,
        datosFactura.cliente_id,
        cliente[0].identificacion,
        cliente[0].nombre,
        datosFactura.periodo_facturacion,
        datosFactura.fecha_emision || new Date().toISOString().split('T')[0],
        datosFactura.fecha_vencimiento,
        datosFactura.fecha_desde,
        datosFactura.fecha_hasta,
        datosFactura.internet || 0,
        datosFactura.television || 0,
        datosFactura.saldo_anterior || 0,
        datosFactura.interes || 0,
        datosFactura.reconexion || 0,
        datosFactura.descuento || 0,
        datosFactura.varios || 0,
        datosFactura.publicidad || 0,
        datosFactura.s_internet || 0,
        datosFactura.s_television || 0,
        datosFactura.s_interes || 0,
        datosFactura.s_reconexion || 0,
        datosFactura.s_descuento || 0,
        datosFactura.s_varios || 0,
        datosFactura.s_publicidad || 0,
        datosFactura.s_iva || 0,
        subtotal,
        iva,
        total,
        datosFactura.estado || 'pendiente',
        datosFactura.ruta || null,
        datosFactura.resolucion || null,
        datosFactura.observaciones || null,
        datosFactura.created_by || null
      ];
      
      const [resultado] = await connection.execute(query, valores);
      
      // Crear detalles de factura si se proporcionan
      if (datosFactura.detalles && datosFactura.detalles.length > 0) {
        for (const detalle of datosFactura.detalles) {
          await connection.execute(`
            INSERT INTO detalle_facturas (
              factura_id, concepto_id, concepto_nombre, cantidad, 
              precio_unitario, descuento, subtotal, iva, total, servicio_cliente_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            resultado.insertId,
            detalle.concepto_id || null,
            detalle.concepto_nombre,
            detalle.cantidad || 1,
            detalle.precio_unitario,
            detalle.descuento || 0,
            detalle.subtotal,
            detalle.iva || 0,
            detalle.total,
            detalle.servicio_cliente_id || null
          ]);
        }
      }

      await connection.commit();
      
      return {
        id: resultado.insertId,
        numero_factura: numeroFactura,
        ...datosFactura
      };
      
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error al crear factura: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Actualizar factura
  static async actualizar(id, datosFactura) {
    try {
      // Verificar si la factura existe
      const facturaExistente = await this.obtenerPorId(id);
      if (!facturaExistente) {
        throw new Error('Factura no encontrada');
      }

      // No permitir actualizar facturas pagadas
      if (facturaExistente.estado === 'pagada') {
        throw new Error('No se puede modificar una factura pagada');
      }

      const camposActualizar = [];
      const valores = [];
      
      // Construir query dinámicamente
      Object.keys(datosFactura).forEach(campo => {
        if (datosFactura[campo] !== undefined && campo !== 'id') {
          camposActualizar.push(`${campo} = ?`);
          valores.push(datosFactura[campo]);
        }
      });
      
      if (camposActualizar.length === 0) {
        throw new Error('No hay campos para actualizar');
      }
      
      valores.push(id);
      
      const query = `
        UPDATE facturas 
        SET ${camposActualizar.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;
      
      const connection = await pool.getConnection();
      await connection.execute(query, valores);
      connection.release();
      
      return await this.obtenerPorId(id);
    } catch (error) {
      throw new Error(`Error al actualizar factura: ${error.message}`);
    }
  }

  // Marcar como pagada
  static async marcarComoPagada(id, datosPago) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verificar que la factura existe y está pendiente
      const [factura] = await connection.execute(
        'SELECT estado, total FROM facturas WHERE id = ?',
        [id]
      );
      
      if (!factura[0]) {
        throw new Error('Factura no encontrada');
      }
      
      if (factura[0].estado === 'pagada') {
        throw new Error('La factura ya está pagada');
      }

      // Actualizar factura
      await connection.execute(`
        UPDATE facturas 
        SET estado = 'pagada', 
            fecha_pago = ?, 
            metodo_pago = ?, 
            referencia_pago = ?, 
            banco_id = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [
        datosPago.fecha_pago || new Date().toISOString().split('T')[0],
        datosPago.metodo_pago,
        datosPago.referencia_pago || null,
        datosPago.banco_id || null,
        id
      ]);

      await connection.commit();
      return await this.obtenerPorId(id);
      
    } catch (error) {
      await connection.rollback();
      throw new Error(`Error al marcar factura como pagada: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Anular factura
  static async anular(id, motivo) {
    try {
      const factura = await this.obtenerPorId(id);
      if (!factura) {
        throw new Error('Factura no encontrada');
      }

      if (factura.estado === 'pagada') {
        throw new Error('No se puede anular una factura pagada');
      }

      const connection = await pool.getConnection();
      await connection.execute(`
        UPDATE facturas 
        SET estado = 'anulada', 
            observaciones = CONCAT(IFNULL(observaciones, ''), '\nANULADA: ', ?),
            updated_at = NOW()
        WHERE id = ?
      `, [motivo, id]);
      connection.release();

      return await this.obtenerPorId(id);
    } catch (error) {
      throw new Error(`Error al anular factura: ${error.message}`);
    }
  }

  // Buscar facturas
  static async buscar(termino, filtros = {}) {
    try {
      let query = `
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.direccion as cliente_direccion
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE (
          f.numero_factura LIKE ? OR 
          f.identificacion_cliente LIKE ? OR 
          f.nombre_cliente LIKE ?
        )
      `;
      
      const searchTerm = `%${termino}%`;
      const params = [searchTerm, searchTerm, searchTerm];
      
      if (filtros.estado) {
        query += ' AND f.estado = ?';
        params.push(filtros.estado);
      }
      
      const limitNum = parseInt(filtros.limite) || 50;
      const offset = parseInt(filtros.offset) || 0;

      const sortColumnSafe = 'created_at';      // columna segura
      const sortDirectionSafe = 'DESC';         // dirección segura

      query += ` ORDER BY ${sortColumnSafe} ${sortDirectionSafe} LIMIT ${limitNum} OFFSET ${offset}`;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error en búsqueda de facturas: ${error.message}`);
    }
  }

  // Estadísticas de facturas
  static async obtenerEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as pagadas,
          SUM(CASE WHEN estado = 'vencida' THEN 1 ELSE 0 END) as vencidas,
          SUM(CASE WHEN estado = 'anulada' THEN 1 ELSE 0 END) as anuladas,
          SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as valor_pendiente,
          SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as valor_pagado,
          SUM(CASE WHEN estado = 'pendiente' AND fecha_vencimiento < CURDATE() THEN total ELSE 0 END) as cartera_vencida,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as facturadas_hoy,
          SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN total ELSE 0 END) as facturado_mes_actual
        FROM facturas
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query);
      connection.release();
      
      return filas[0];
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  // Obtener facturas vencidas
  static async obtenerVencidas(filtros = {}) {
    try {
      let query = `
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.direccion as cliente_direccion,
          c.telefono as cliente_telefono,
          DATEDIFF(CURDATE(), f.fecha_vencimiento) as dias_vencido
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE f.estado = 'pendiente' AND f.fecha_vencimiento < CURDATE()
      `;
      
      const params = [];
      
      if (filtros.dias_minimos) {
        query += ' AND DATEDIFF(CURDATE(), f.fecha_vencimiento) >= ?';
        params.push(filtros.dias_minimos);
      }
      
      if (filtros.ruta) {
        query += ' AND f.ruta = ?';
        params.push(filtros.ruta);
      }
      
      query += ' ORDER BY f.fecha_vencimiento ASC';
      
      if (filtros.limite) {
      const limitNum = parseInt(filtros.limite);
      const offset = parseInt(filtros.offset) || 0;

      query += ` ORDER BY ${sortColumnSafe} ${sortDirectionSafe} LIMIT ${limitNum} OFFSET ${offset}`;
    }
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error al obtener facturas vencidas: ${error.message}`);
    }
  }

  // Obtener detalles de factura
  static async obtenerDetalles(facturaId) {
    try {
      const query = `
        SELECT 
          df.*,
          cf.nombre as concepto_nombre_completo,
          cf.tipo as concepto_tipo
        FROM detalle_facturas df
        LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
        WHERE df.factura_id = ?
        ORDER BY df.id
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [facturaId]);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error al obtener detalles de factura: ${error.message}`);
    }
  }
}

module.exports = Factura;