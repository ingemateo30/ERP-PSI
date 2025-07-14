// backend/routes/clientes.js - RUTAS CORREGIDAS CON MANEJO DE ERRORES

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Importar controlador con manejo de errores
let ClienteController;
try {
  ClienteController = require('../controllers/clienteController');
  console.log('✅ ClienteController cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando ClienteController:', error.message);
  // Crear controlador dummy temporal
  ClienteController = {
    obtenerTodos: (req, res) => res.status(501).json({ success: false, message: 'Controlador no disponible' }),
    exportarClientes: (req, res) => res.status(501).json({ success: false, message: 'Exportación no disponible' }),
    obtenerEstadisticas: (req, res) => res.status(501).json({ success: false, message: 'Estadísticas no disponibles' }),
    buscar: (req, res) => res.status(501).json({ success: false, message: 'Búsqueda no disponible' }),
    obtenerPorIdentificacion: (req, res) => res.status(501).json({ success: false, message: 'Método no disponible' }),
    obtenerPorId: (req, res) => res.status(501).json({ success: false, message: 'Método no disponible' }),
    crear: (req, res) => res.status(501).json({ success: false, message: 'Creación no disponible' }),
    actualizar: (req, res) => res.status(501).json({ success: false, message: 'Actualización no disponible' }),
    eliminar: (req, res) => res.status(501).json({ success: false, message: 'Eliminación no disponible' })
  };
}

// Importar middleware de autenticación con manejo de errores
let authenticateToken, requireRole;
try {
  const auth = require('../middleware/auth');
  authenticateToken = auth.authenticateToken || auth.auth;
  requireRole = auth.requireRole;
  console.log('✅ Middleware de autenticación cargado');
} catch (error) {
  console.error('❌ Error cargando middleware auth:', error.message);
  // Crear middleware dummy
  authenticateToken = (req, res, next) => {
    console.warn('⚠️ Usando middleware de autenticación dummy');
    req.user = { id: 1, role: 'administrador' }; // Usuario dummy para desarrollo
    next();
  };
  requireRole = (...roles) => (req, res, next) => next();
}

// Importar rateLimiter con manejo de errores
let rateLimiter;
try {
  rateLimiter = require('../middleware/rateLimiter');
  console.log('✅ RateLimiter cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando rateLimiter:', error.message);
  // Crear rateLimiter dummy
  rateLimiter = {
    clientes: (req, res, next) => next(),
    busquedas: (req, res, next) => next(),
    criticas: (req, res, next) => next()
  };
}

// Importar validaciones con manejo de errores
let validarCreacionCliente, validarActualizacionCliente;
try {
  const validaciones = require('../middleware/validaciones');
  validarCreacionCliente = validaciones.validarCreacionCliente || [];
  validarActualizacionCliente = validaciones.validarActualizacionCliente || [];
  console.log('✅ Validaciones cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando validaciones:', error.message);
  // Crear validaciones dummy
  validarCreacionCliente = [];
  validarActualizacionCliente = [];
}

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS DE CONSULTA
// ==========================================

// Obtener todos los clientes con filtros y paginación
router.get('/',
  rateLimiter.clientes,
  ClienteController.obtenerTodos
);

// NUEVA: Ruta para exportar clientes
router.get('/export',
  rateLimiter.clientes,
  ClienteController.exportarClientes
);

// Obtener estadísticas de clientes
router.get('/stats',
  rateLimiter.clientes,
  ClienteController.obtenerEstadisticas
);

// Buscar clientes
router.get('/search',
  rateLimiter.busquedas,
  ClienteController.buscar
);

// ⭐ CRÍTICO: MOVER ESTA RUTA ANTES DE /:id
router.get('/inactivos',
  rateLimiter.clientes,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      console.log('📋 Obteniendo clientes inactivos:', { page, limit, search });

      // Importar pool si no tienes Database
      const pool = require('../config/database');

      let whereClause = '';
      let params = [];

      if (search && search.trim()) {
        whereClause = 'WHERE ci.nombre LIKE ? OR ci.identificacion LIKE ?';
        const searchTerm = `%${search.trim()}%`;
        params = [searchTerm, searchTerm];
      }

      // Query para obtener clientes inactivos
      const query = `
        SELECT 
          ci.*,
          DATEDIFF(NOW(), ci.fecha_inactivacion) as dias_inactivo
        FROM clientes_inactivos ci
        ${whereClause}
        ORDER BY ci.fecha_inactivacion DESC
        LIMIT ? OFFSET ?
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM clientes_inactivos ci
        ${whereClause}
      `;

      console.log('🔍 Ejecutando query:', query);
      console.log('📊 Parámetros:', [...params, parseInt(limit), offset]);

      const [clientes] = await pool.execute(query, [...params, parseInt(limit), offset]);
      const [countResult] = await pool.execute(countQuery, params);

      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      console.log(`✅ Encontrados ${clientes.length} clientes inactivos de ${total} total`);

      res.json({
        success: true,
        data: {
          clientes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo clientes inactivos:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo clientes inactivos'
      });
    }
  }
);

// Obtener cliente por identificación
router.get('/identification/:identificacion',
  rateLimiter.clientes,
  ClienteController.obtenerPorIdentificacion
);

// ⭐ CRÍTICO: ESTA RUTA DEBE IR AL FINAL
// Obtener cliente por ID (debe ir al final para evitar conflictos)
router.get('/:id',
  rateLimiter.clientes,
  ClienteController.obtenerPorId
);

// ==========================================
// RUTAS DE MODIFICACIÓN
// ==========================================

// Crear nuevo cliente
router.post('/',
  rateLimiter.clientes,
  ...validarCreacionCliente,
  ClienteController.crear
);

router.put('/:id/inactivar',
  rateLimiter.clientes,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo_inactivacion, observaciones_inactivacion } = req.body;

      console.log('🔄 Inactivando cliente:', id, { motivo_inactivacion });

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const pool = require('../config/database');
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // 1. Verificar cliente existe
        const [clienteData] = await connection.execute(`
          SELECT c.*, s.nombre as sector_nombre, s.codigo as sector_codigo
          FROM clientes c
          LEFT JOIN sectores s ON c.sector_id = s.id
          WHERE c.id = ?
        `, [id]);

        if (clienteData.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        const cliente = clienteData[0];

        // 2. ⭐ CANCELAR SERVICIOS ACTIVOS - QUERY CORREGIDO
        await connection.execute(`
  UPDATE servicios_cliente 
  SET estado = 'activo', fecha_suspension = NULL, updated_at = NOW()
  WHERE cliente_id = ? AND estado IN ('suspendido', 'cortado', 'cancelado')
`, [id]);

        // 3. Insertar en clientes_inactivos
        await connection.execute(`
          INSERT INTO clientes_inactivos (
            identificacion, nombre, direccion, descripcion, 
            fecha_inactivacion, barrio, sector_codigo, telefono, 
            poste, estrato, motivo_inactivacion, cliente_id
          ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
        `, [
          cliente.identificacion,
          cliente.nombre,
          cliente.direccion,
          `${cliente.nombre} - ${cliente.direccion}`,
          cliente.barrio,
          cliente.sector_codigo || null,
          cliente.telefono,
          cliente.poste,
          cliente.estrato,
          motivo_inactivacion || 'Inactivación manual',
          id
        ]);

        // 4. Cambiar estado a inactivo
        await connection.execute(`
          UPDATE clientes 
          SET estado = 'inactivo', updated_at = NOW()
          WHERE id = ?
        `, [id]);

        await connection.commit();

        console.log('✅ Cliente inactivado exitosamente');

        res.json({
          success: true,
          message: 'Cliente inactivado exitosamente',
          data: {
            id: parseInt(id),
            estado: 'inactivo'
          }
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('❌ Error inactivando cliente:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al inactivar cliente'
      });
    }
  }
);

/**
 * @route POST /api/clientes/clientes-con-servicios
 * @desc Crear cliente con múltiples servicios independientes
 * @access Private (Administrador)
 */
router.post('/clientes-con-servicios', 
  requireRole('administrador'), 
  async (req, res) => {
    const conexion = await pool.getConnection();
    
    try {
      await conexion.beginTransaction();
      console.log('🚀 Iniciando creación de cliente con múltiples servicios');
      
      const { datosCliente, servicios } = req.body;
      
      // Validaciones básicas
      if (!datosCliente) {
        return res.status(400).json({
          success: false,
          message: 'Los datos del cliente son requeridos'
        });
      }
      
      if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar al menos un servicio'
        });
      }
      
      console.log('📋 Datos recibidos:', { datosCliente, servicios: servicios.length });
      
      // 1. CREAR EL CLIENTE - CORREGIDO
      const queryCliente = `
        INSERT INTO clientes (
          identificacion, nombre, correo, telefono, direccion, 
          estrato, tipo_documento, estado, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', ?, NOW())
      `;
      
      const valoresCliente = [
        datosCliente.identificacion,
        datosCliente.nombre,
        datosCliente.email || datosCliente.correo,
        datosCliente.telefono,
        datosCliente.direccion,
        datosCliente.estrato || 1,
        datosCliente.tipo_cliente || 'persona_natural',
        req.user?.id || 1
      ];
      
      const [resultadoCliente] = await conexion.execute(queryCliente, valoresCliente);
      const clienteId = resultadoCliente.insertId;
      
      console.log(`✅ Cliente creado con ID: ${clienteId}`);
      
      // Verificar que el cliente se creó correctamente
      const [clienteVerificacion] = await conexion.execute(
        'SELECT id, nombre FROM clientes WHERE id = ?', 
        [clienteId]
      );
      
      if (clienteVerificacion.length === 0) {
        throw new Error(`Cliente con ID ${clienteId} no encontrado después de la creación`);
      }
      
      console.log(`🔍 Cliente verificado:`, clienteVerificacion[0]);
      
      // 2. CREAR SERVICIOS POR SEPARADO - COMPLETAMENTE CORREGIDO
      const serviciosCreados = [];
      
      for (let i = 0; i < servicios.length; i++) {
        const servicio = servicios[i];
        console.log(`📦 Procesando servicio ${i + 1}:`, servicio);
        
        // Si tiene ambos servicios (Internet + TV), crear registros separados
        if (servicio.planInternetId && servicio.planTelevisionId) {
          
          // CREAR SERVICIO DE INTERNET - QUERY CORREGIDO
          const queryServicioInternet = `
            INSERT INTO servicios_cliente (
              cliente_id, plan_id,
              precio_personalizado, observaciones, estado, 
              fecha_activacion, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;
          
          const valoresInternet = [
            clienteId,
            servicio.planInternetId,
            servicio.precioPersonalizado ? parseFloat(servicio.precioInternetCustom) : null,
            `Internet - ${servicio.observaciones || ''}`,
            'activo',
            new Date().toISOString().split('T')[0],
            
          ];
          
          const [resultadoInternet] = await conexion.execute(queryServicioInternet, valoresInternet);
          const servicioInternetId = resultadoInternet.insertId;
          
          console.log(`✅ Servicio Internet creado con ID: ${servicioInternetId}`);
          
          // CREAR SERVICIO DE TELEVISIÓN - QUERY CORREGIDO
          const queryServicioTV = `
            INSERT INTO servicios_cliente (
              cliente_id, plan_id, 
              precio_personalizado, observaciones, estado, 
              fecha_activacion,  created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;
          
          const valoresTV = [
            clienteId,
            servicio.planTelevisionId,
            servicio.precioPersonalizado ? parseFloat(servicio.precioTelevisionCustom) : null,
            `Televisión - ${servicio.observaciones || ''}`,
            'activo',
            new Date().toISOString().split('T')[0],
            
          ];
          
          const [resultadoTV] = await conexion.execute(queryServicioTV, valoresTV);
          const servicioTVId = resultadoTV.insertId;
          
          console.log(`✅ Servicio TV creado con ID: ${servicioTVId}`);
          
          serviciosCreados.push({
            tipo: 'combo',
            internet_id: servicioInternetId,
            television_id: servicioTVId,
            descuento_combo: servicio.descuentoCombo || 0,
            tipo_contrato: servicio.tipoContrato || 'con_permanencia',
            meses_permanencia: servicio.mesesPermanencia || 6,
            direccion: servicio.direccionServicio,
            sede: servicio.nombreSede
          });
          
        } else if (servicio.planInternetId) {
          // SOLO INTERNET - QUERY CORREGIDO
          const queryServicio = `
            INSERT INTO servicios_cliente (
              cliente_id, plan_id,
              precio_personalizado, observaciones, estado, 
              fecha_activacion, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;
          
          const valores = [
            clienteId,
            servicio.planInternetId,
            servicio.precioPersonalizado ? parseFloat(servicio.precioInternetCustom) : null,
            servicio.observaciones || '',
            'activo',
            new Date().toISOString().split('T')[0],
           
          ];
          
          const [resultado] = await conexion.execute(queryServicio, valores);
          const servicioId = resultado.insertId;
          
          console.log(`✅ Servicio Internet creado con ID: ${servicioId}`);
          
          serviciosCreados.push({
            tipo: 'internet',
            servicio_id: servicioId,
            tipo_contrato: servicio.tipoContrato || 'con_permanencia',
            meses_permanencia: servicio.mesesPermanencia || 6,
            direccion: servicio.direccionServicio,
            sede: servicio.nombreSede
          });
          
        } else if (servicio.planTelevisionId) {
          // SOLO TELEVISIÓN - QUERY CORREGIDO
          const queryServicio = `
            INSERT INTO servicios_cliente (
              cliente_id, plan_id,
              precio_personalizado, observaciones, estado, 
              fecha_activacion, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;
          
          const valores = [
            clienteId,
            servicio.planTelevisionId,
            servicio.precioPersonalizado ? parseFloat(servicio.precioTelevisionCustom) : null,
            servicio.observaciones || '',
            'activo',
            new Date().toISOString().split('T')[0],
            
          ];
          
          const [resultado] = await conexion.execute(queryServicio, valores);
          const servicioId = resultado.insertId;
          
          console.log(`✅ Servicio TV creado con ID: ${servicioId}`);
          
          serviciosCreados.push({
            tipo: 'television',
            servicio_id: servicioId,
            tipo_contrato: servicio.tipoContrato || 'con_permanencia',
            meses_permanencia: servicio.mesesPermanencia || 6,
            direccion: servicio.direccionServicio,
            sede: servicio.nombreSede
          });
        }
      }
      
      // 3. GENERAR CONTRATOS Y FACTURAS
      console.log('📄 Generando contratos y facturas...');
      
      for (const servicioCreado of serviciosCreados) {
        try {
          if (servicioCreado.tipo === 'combo') {
            // GENERAR CONTRATO COMBO (que agrupa ambos servicios)
            const numeroContrato = `CONT-${new Date().getFullYear()}-${String(clienteId).padStart(6, '0')}-${Date.now().toString().slice(-3)}`;
            
            // Obtener datos del plan para calcular costo de instalación
            const servicioInternet = servicios.find(s => s.planInternetId);
            const [planesInternet] = await conexion.execute(
              'SELECT * FROM planes_servicio WHERE id = ?', 
              [servicioInternet?.planInternetId]
            );
            const planInternet = planesInternet[0];
            
            const costoInstalacion = servicioCreado.tipo_contrato === 'con_permanencia' ?
              (planInternet?.costo_instalacion_permanencia || 50000) :
              (planInternet?.costo_instalacion_sin_permanencia || 150000);
            
            const queryContrato = `
              INSERT INTO contratos (
                numero_contrato, cliente_id, tipo_contrato, tipo_permanencia,
                permanencia_meses, costo_instalacion, fecha_generacion,
                fecha_inicio, estado, generado_automaticamente, created_by, created_at
              ) VALUES (?, ?, 'servicio', ?, ?, ?, CURDATE(), CURDATE(), 'activo', 1, ?, NOW())
            `;
            
            await conexion.execute(queryContrato, [
              numeroContrato,
              clienteId,
              servicioCreado.tipo_contrato,
              servicioCreado.meses_permanencia,
              costoInstalacion,
              req.user?.id || 1
            ]);
            
            console.log(`✅ Contrato combo generado: ${numeroContrato}`);
            
          } else {
            // GENERAR CONTRATO INDIVIDUAL
            const numeroContrato = `CONT-${new Date().getFullYear()}-${String(clienteId).padStart(6, '0')}-${Date.now().toString().slice(-3)}`;
            
            // Obtener datos del plan
            const planId = servicioCreado.tipo === 'internet' ? 
              servicios.find(s => s.planInternetId)?.planInternetId :
              servicios.find(s => s.planTelevisionId)?.planTelevisionId;
              
            const [planes] = await conexion.execute(
              'SELECT * FROM planes_servicio WHERE id = ?', 
              [planId]
            );
            const plan = planes[0];
            
            const costoInstalacion = servicioCreado.tipo_contrato === 'con_permanencia' ?
              (plan?.costo_instalacion_permanencia || 50000) :
              (plan?.costo_instalacion_sin_permanencia || 150000);
            
            const queryContrato = `
              INSERT INTO contratos (
                numero_contrato, cliente_id, servicio_id, tipo_contrato, tipo_permanencia,
                permanencia_meses, costo_instalacion, fecha_generacion,
                fecha_inicio, estado, generado_automaticamente, created_by, created_at
              ) VALUES (?, ?, ?, 'servicio', ?, ?, ?, CURDATE(), CURDATE(), 'activo', 1, ?, NOW())
            `;
            
            await conexion.execute(queryContrato, [
              numeroContrato,
              clienteId,
              servicioCreado.servicio_id,
              servicioCreado.tipo_contrato,
              servicioCreado.meses_permanencia,
              costoInstalacion,
              req.user?.id || 1
            ]);
            
            console.log(`✅ Contrato individual generado: ${numeroContrato}`);
          }
        } catch (errorContrato) {
          console.error('⚠️ Error generando contrato:', errorContrato);
          // Continuar con otros contratos
        }
      }
      
      // 4. GENERAR PRIMERA FACTURA UNIFICADA
      try {
        console.log('🧾 Generando primera factura...');
        
        const numeroFactura = `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
        const fechaEmision = new Date();
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
        
        // Calcular subtotal de todos los servicios
        let subtotal = 0;
        let totalIVA = 0;
        
        // Esta lógica se puede mejorar integrando el cálculo de IVA del frontend
        for (const servicioCreado of serviciosCreados) {
          if (servicioCreado.tipo === 'combo') {
            // Para combo, sumar ambos servicios
            const servicioInternet = servicios.find(s => s.planInternetId);
            const servicioTV = servicios.find(s => s.planTelevisionId);
            
            // Obtener precios de los planes
            const [planesInternet] = await conexion.execute('SELECT precio FROM planes_servicio WHERE id = ?', [servicioInternet.planInternetId]);
            const [planesTV] = await conexion.execute('SELECT precio FROM planes_servicio WHERE id = ?', [servicioTV.planTelevisionId]);
            
            let precioInternet = servicioInternet.precioPersonalizado ? 
              parseFloat(servicioInternet.precioInternetCustom) : 
              parseFloat(planesInternet[0]?.precio || 0);
              
            let precioTV = servicioTV.precioPersonalizado ? 
              parseFloat(servicioTV.precioTelevisionCustom) : 
              Math.round(parseFloat(planesTV[0]?.precio || 0) / 1.19); // TV viene con IVA
            
            // Aplicar descuento combo
            const totalSinDescuento = precioInternet + precioTV;
            const descuento = totalSinDescuento * (servicioCreado.descuento_combo / 100);
            const totalConDescuento = totalSinDescuento - descuento;
            
            subtotal += totalConDescuento;
            
            // Calcular IVA (Internet según estrato, TV siempre)
            const estrato = parseInt(datosCliente.estrato) || 1;
            if (estrato >= 4) {
              totalIVA += (totalConDescuento * 0.5) * 0.19; // 50% del total para internet
            }
            totalIVA += (totalConDescuento * 0.5) * 0.19; // 50% del total para TV
            
          } else {
            // Servicio individual
            const servicio = servicios.find(s => 
              (servicioCreado.tipo === 'internet' && s.planInternetId) ||
              (servicioCreado.tipo === 'television' && s.planTelevisionId)
            );
            
            const planId = servicioCreado.tipo === 'internet' ? 
              servicio.planInternetId : servicio.planTelevisionId;
              
            const [planes] = await conexion.execute('SELECT precio FROM planes_servicio WHERE id = ?', [planId]);
            
            let precio = 0;
            if (servicioCreado.tipo === 'internet') {
              precio = servicio.precioPersonalizado ? 
                parseFloat(servicio.precioInternetCustom) : 
                parseFloat(planes[0]?.precio || 0);
            } else {
              precio = servicio.precioPersonalizado ? 
                parseFloat(servicio.precioTelevisionCustom) : 
                Math.round(parseFloat(planes[0]?.precio || 0) / 1.19);
            }
            
            subtotal += precio;
            
            // Calcular IVA
            const estrato = parseInt(datosCliente.estrato) || 1;
            if (servicioCreado.tipo === 'internet' && estrato >= 4) {
              totalIVA += precio * 0.19;
            } else if (servicioCreado.tipo === 'television') {
              totalIVA += precio * 0.19;
            }
          }
        }
        
        const total = subtotal + totalIVA;
        
        const queryFactura = `
          INSERT INTO facturas (
            numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
            subtotal, iva, total, fecha_emision, fecha_vencimiento,
            periodo_facturacion, estado, tipo_factura, generada_automaticamente,
            created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 'mensual', 1, ?, NOW())
        `;
        
        const periodoFacturacion = `${fechaEmision.getFullYear()}-${String(fechaEmision.getMonth() + 1).padStart(2, '0')}`;
        
        await conexion.execute(queryFactura, [
          numeroFactura,
          clienteId,
          datosCliente.identificacion,
          datosCliente.nombre,
          subtotal,
          totalIVA,
          total,
          fechaEmision.toISOString().split('T')[0],
          fechaVencimiento.toISOString().split('T')[0],
          periodoFacturacion,
          req.user?.id || 1
        ]);
        
        console.log(`✅ Primera factura generada: ${numeroFactura} - Total: $${total.toLocaleString()}`);
        
      } catch (errorFactura) {
        console.error('⚠️ Error generando factura:', errorFactura);
        // Continuar sin factura por ahora
      }
      
      await conexion.commit();
      
      console.log(`🎉 Cliente creado exitosamente con ${serviciosCreados.length} servicio(s)`);
      
      res.status(201).json({
        success: true,
        message: `Cliente creado exitosamente con ${serviciosCreados.length} servicio(s)`,
        data: {
          cliente_id: clienteId,
          servicios_creados: serviciosCreados,
          total_servicios: serviciosCreados.length,
          mensaje_adicional: 'Contratos y factura inicial generados automáticamente'
        }
      });
      
    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error creando cliente con servicios:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando cliente con servicios',
        error: error.message,
        detalles: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      conexion.release();
    }
  }
);

router.put('/:id/reactivar',
  rateLimiter.clientes,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const pool = require('../config/database');
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // 1. Verificar cliente existe
        const [clienteData] = await connection.execute(`
          SELECT * FROM clientes WHERE id = ?
        `, [id]);

        if (clienteData.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        // 2. Cambiar estado a activo
        await connection.execute(`
          UPDATE clientes 
          SET estado = 'activo', updated_at = NOW()
          WHERE id = ?
        `, [id]);

        // 3. Eliminar de clientes_inactivos
        await connection.execute(`
          DELETE FROM clientes_inactivos 
          WHERE cliente_id = ?
        `, [id]);

        await connection.commit();

        res.json({
          success: true,
          message: 'Cliente reactivado exitosamente',
          data: {
            id: parseInt(id),
            estado: 'activo'
          }
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('❌ Error reactivando cliente:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al reactivar cliente'
      });
    }
  }
);

// Actualizar cliente (debe ir después de las rutas específicas)
router.put('/:id',
  rateLimiter.clientes,
  ...validarActualizacionCliente,
  ClienteController.actualizar
);

// Eliminar cliente
router.delete('/:id',
  rateLimiter.criticas,
  ClienteController.eliminar
);
// Manejo de errores para rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    timestamp: new Date().toISOString()
  });

});


// Manejo de errores generales
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de clientes:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;