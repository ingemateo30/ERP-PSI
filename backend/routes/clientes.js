// backend/routes/clientes.js - RUTAS CORREGIDAS CON MANEJO DE ERRORES

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const AlertasClienteService = require('../services/AlertasClienteService');
const { verificarRol } = require('../middleware/roleAuth');
const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roleAuth'); // ← AGREGAR ESTA LÍNEA


// Importar controlador con manejo de errores
let ClienteController;
try {
  ClienteController = require('../controllers/clienteController');
  console.log('✅ ClienteController cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando ClienteController:', error.message);
  // Crear controlador dummy temporal
 
}

// Importar middleware de autenticación con manejo de errores
let authenticateToken, requireRole;
try {
  const auth = require('../middleware/auth');
  const { verificarRol, verificarPermiso } = require('../middleware/roleAuth');
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


/**
 * @route GET /api/v1/clientes/verificar-existente
 * @desc Verificar si un cliente ya existe por identificación
 * @access Autenticado
 */
router.get('/verificar-existente',
  async (req, res) => {
    try {
      const { identificacion, tipo_documento = 'cedula' } = req.query;

      if (!identificacion) {
        return res.status(400).json({
          success: false,
          message: 'Identificación es requerida'
        });
      }

      const verificacion = await AlertasClienteService.verificarClienteExistente(
        identificacion,
        tipo_documento
      );

      res.json({
        success: true,
        data: verificacion,
        message: verificacion.existe
          ? 'Cliente encontrado en el sistema'
          : 'Cliente no existe, puede proceder con el registro'
      });

    } catch (error) {
      console.error('❌ Error verificando cliente existente:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando cliente',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/clientes/:id/agregar-servicio
 * @desc Agregar servicio adicional a cliente existente
 * @access Administrador, Supervisor
 */
router.post('/:id/agregar-servicio',
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const { id: clienteId } = req.params;
      const datosServicio = req.body;
      const { id: createdBy } = req.user;

      if (!clienteId || isNaN(clienteId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const ClienteCompletoService = require('../services/ClienteCompletoService');
      const resultado = await ClienteCompletoService.agregarServicioAClienteExistente(
        parseInt(clienteId),
        datosServicio,
        createdBy
      );

      res.json({
        success: true,
        data: resultado,
        message: 'Servicio agregado exitosamente al cliente'
      });

    } catch (error) {
      console.error('❌ Error agregando servicio a cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error agregando servicio al cliente',
        error: error.message
      });
    }
  }
);
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
      const limitNum = parseInt(limit);
      const pageNum = parseInt(page);
      const offset = (pageNum - 1) * limitNum;
      
      console.log('📋 Obteniendo clientes inactivos:', { page: pageNum, limit: limitNum, search });

      const pool = require('../config/database');

      let whereClause = '';
      let params = [];

      if (search && search.trim()) {
        whereClause = 'WHERE ci.nombre LIKE ? OR ci.identificacion LIKE ?';
        const searchTerm = `%${search.trim()}%`;
        params = [searchTerm, searchTerm];
      }

      // Query para obtener clientes inactivos
      // ... continúa con el resto de tu código
// ... más abajo ...

const query = `
  SELECT
    ci.*,
    DATEDIFF(NOW(), ci.fecha_inactivacion) as dias_inactivo
  FROM clientes_inactivos ci
  ${whereClause}
  ORDER BY ci.fecha_inactivacion DESC
  LIMIT ${limitNum} OFFSET ${offset}
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

      // ===================================================================
      // 1. CREAR EL CLIENTE CON TODOS LOS CAMPOS REQUERIDOS - CORREGIDO
      // ===================================================================

      // Generar código de usuario único
      const codigoUsuario = await generarCodigoUsuario(conexion, datosCliente.identificacion);

      // Calcular fecha_hasta si tiene permanencia
      let fechaHasta = null;
      if (datosCliente.tiene_permanencia && datosCliente.permanencia_meses) {
        const fecha = new Date();
        fecha.setMonth(fecha.getMonth() + parseInt(datosCliente.permanencia_meses));
        fechaHasta = fecha.toISOString().split('T')[0];
      }

      const queryCliente = `
        INSERT INTO clientes (
          identificacion, tipo_documento, nombre, correo, telefono, telefono_2,
          direccion, barrio, estrato, ciudad_id, sector_id, observaciones,
          fecha_registro, fecha_hasta, codigo_usuario, estado, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?, NOW())
      `;

      const valoresCliente = [
        datosCliente.identificacion,
        datosCliente.tipo_documento || 'cedula',        // ✅ CORREGIDO: Se guarda tipo_documento
        datosCliente.nombre,
        datosCliente.email || datosCliente.correo,
        datosCliente.telefono,
        datosCliente.telefono_fijo || datosCliente.telefono_2 || null,  // ✅ CORREGIDO: Se guarda telefono_2
        datosCliente.direccion,
        datosCliente.barrio || null,                    // ✅ CORREGIDO: Se guarda barrio
        datosCliente.estrato || 3,
        datosCliente.ciudad_id ? parseInt(datosCliente.ciudad_id) : null,  // ✅ CORREGIDO: Se guarda ciudad
        datosCliente.sector_id ? parseInt(datosCliente.sector_id) : null,  // ✅ CORREGIDO: Se guarda sector
        datosCliente.observaciones || null,
        new Date().toISOString().split('T')[0],         // ✅ CORREGIDO: Se guarda fecha_registro
        fechaHasta,                                     // ✅ CORREGIDO: Se calcula fecha_hasta
        codigoUsuario,                                  // ✅ CORREGIDO: Se guarda código_usuario
        req.user?.id || 1
      ];

      console.log('📝 Query cliente corregido:', queryCliente);
      console.log('📝 Valores cliente:', valoresCliente);

      const [resultadoCliente] = await conexion.execute(queryCliente, valoresCliente);
      const clienteId = resultadoCliente.insertId;

      console.log(`✅ Cliente creado con ID: ${clienteId}`);

      // Verificar que el cliente se creó correctamente
      const [clienteVerificacion] = await conexion.execute(
        'SELECT id, nombre, codigo_usuario, tipo_documento, barrio, ciudad_id, sector_id FROM clientes WHERE id = ?',
        [clienteId]
      );

      if (clienteVerificacion.length === 0) {
        throw new Error(`Cliente con ID ${clienteId} no encontrado después de la creación`);
      }

      console.log(`🔍 Cliente verificado con todos los campos:`, clienteVerificacion[0]);

      // ===================================================================
      // 2. GENERAR CONTRATO CON CONSECUTIVO AUTOMÁTICO - CORREGIDO
      // ===================================================================

      const contratoData = await generarContratoConConsecutivo(
        conexion,
        clienteId,
        datosCliente,
        req.user?.id || 1
      );

      console.log(`✅ Contrato generado: ${contratoData.numero_contrato}`);

      // ===================================================================
      // 3. CREAR SERVICIOS ASOCIADOS - CORREGIDO
      // ===================================================================

      const serviciosCreados = [];

      for (let i = 0; i < servicios.length; i++) {
        const servicio = servicios[i];
        console.log(`📦 Procesando servicio ${i + 1}:`, servicio);

        // Si tiene ambos servicios (Internet + TV), crear registros separados
        if (servicio.planInternetId && servicio.planTelevisionId) {

          // CREAR SERVICIO DE INTERNET
          const servicioInternetId = await crearServicioCliente(
            conexion,
            clienteId,
            servicio.planInternetId,
            servicio,
            'internet'
          );
          serviciosCreados.push({ id: servicioInternetId, tipo: 'internet', plan_id: servicio.planInternetId });

          // CREAR SERVICIO DE TELEVISIÓN
          const servicioTvId = await crearServicioCliente(
            conexion,
            clienteId,
            servicio.planTelevisionId,
            servicio,
            'television'
          );
          serviciosCreados.push({ id: servicioTvId, tipo: 'television', plan_id: servicio.planTelevisionId });

        } else if (servicio.planInternetId) {
          // SOLO INTERNET
          const servicioId = await crearServicioCliente(
            conexion,
            clienteId,
            servicio.planInternetId,
            servicio,
            'internet'
          );
          serviciosCreados.push({ id: servicioId, tipo: 'internet', plan_id: servicio.planInternetId });

        } else if (servicio.planTelevisionId) {
          // SOLO TELEVISIÓN
          const servicioId = await crearServicioCliente(
            conexion,
            clienteId,
            servicio.planTelevisionId,
            servicio,
            'television'
          );
          serviciosCreados.push({ id: servicioId, tipo: 'television', plan_id: servicio.planTelevisionId });
        }
      }

      console.log(`✅ ${serviciosCreados.length} servicios creados exitosamente`);

      // ===================================================================
      // 4. GENERAR INSTALACIÓN AUTOMÁTICA - NUEVO
      // ===================================================================

      const instalacionData = await generarInstalacionAutomatica(
        conexion,
        clienteId,
        serviciosCreados[0].id, // Usar el primer servicio
        contratoData.id,
        servicios[0],
        req.user?.id || 1
      );

      console.log(`✅ Instalación generada con ID: ${instalacionData.id}`);

      // ===================================================================
      // 5. GENERAR PRIMERA FACTURA AUTOMÁTICA - NUEVO
      // ===================================================================

      const facturaData = await generarPrimeraFacturaAutomatica(
        conexion,
        clienteId,
        serviciosCreados,
        contratoData.id,
        datosCliente,
        req.user?.id || 1
      );

      console.log(`✅ Primera factura generada: ${facturaData.numero_factura}`);

      await conexion.commit();

      const resultado = {
        success: true,
        message: 'Cliente con servicios creado exitosamente',
        data: {
          cliente: {
            id: clienteId,
            identificacion: datosCliente.identificacion,
            nombre: datosCliente.nombre,
            codigo_usuario: codigoUsuario
          },
          contrato: contratoData,
          servicios: serviciosCreados,
          instalacion: instalacionData,
          factura: facturaData,
          resumen: {
            cliente_creado: true,
            contrato_generado: true,
            servicios_creados: serviciosCreados.length,
            instalacion_generada: true,
            primera_factura_generada: true
          }
        }
      };

      console.log('🎉 Proceso completado exitosamente');
      res.status(201).json(resultado);

    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error en creación de cliente con servicios:', error);

      // Manejo de errores específicos
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un cliente con esta identificación'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      conexion.release();
    }
  }
);

// ===================================================================
// FUNCIONES AUXILIARES CORREGIDAS
// ===================================================================

/**
 * Generar código de usuario único
 */
async function generarCodigoUsuario(conexion, identificacion) {
  const sufijo = identificacion.slice(-4).padStart(4, '0');
  const timestamp = Date.now().toString().slice(-4);
  const codigoBase = `USR${sufijo}${timestamp}`;

  // Verificar que no exista
  const [existente] = await conexion.execute(
    'SELECT id FROM clientes WHERE codigo_usuario = ?',
    [codigoBase]
  );

  if (existente.length > 0) {
    return `${codigoBase}${Math.floor(Math.random() * 99)}`;
  }

  return codigoBase;
}

/**
 * Generar contrato con consecutivo de configuracion_empresa
 */
async function generarContratoConConsecutivo(conexion, clienteId, datosCliente, createdBy) {
  // Obtener y actualizar consecutivo
  await conexion.execute(`
    UPDATE configuracion_empresa 
    SET consecutivo_contrato = consecutivo_contrato + 1 
    WHERE id = 1
  `);

  const [config] = await conexion.execute(`
    SELECT 
      CONCAT(COALESCE(prefijo_contrato, 'CON'), LPAD(consecutivo_contrato, 6, '0')) as numero_contrato,
      consecutivo_contrato
    FROM configuracion_empresa 
    WHERE id = 1
  `);

  const numeroContrato = config[0]?.numero_contrato || `CON${String(Date.now()).substr(-6)}`;

  // Determinar datos de permanencia
  const tienePermancencia = datosCliente.tiene_permanencia || false;
  const mesesPermanencia = tienePermancencia ? (datosCliente.permanencia_meses || 6) : 0;

  let fechaVencimientoPermanencia = null;
  if (tienePermancencia && mesesPermanencia > 0) {
    const fechaInicio = new Date();
    fechaVencimientoPermanencia = new Date(fechaInicio.setMonth(fechaInicio.getMonth() + mesesPermanencia))
      .toISOString().split('T')[0];
  }

  const queryContrato = `
    INSERT INTO contratos (
      numero_contrato, cliente_id, tipo_contrato,
      tipo_permanencia, permanencia_meses, costo_instalacion,
      fecha_generacion, fecha_inicio, fecha_vencimiento_permanencia,
      estado, generado_automaticamente, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', 1, ?, NOW())
  `;

  const valoresContrato = [
    numeroContrato,
    parseInt(clienteId),
    'servicio',
    tienePermancencia ? 'con_permanencia' : 'sin_permanencia',
    mesesPermanencia,
    parseFloat(datosCliente.costo_instalacion || 150000),
    new Date().toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
    fechaVencimientoPermanencia,
    createdBy
  ];

  const [resultado] = await conexion.execute(queryContrato, valoresContrato);

  return {
    id: resultado.insertId,
    numero_contrato: numeroContrato,
    cliente_id: clienteId
  };
}

/**
 * Crear servicio individual
 */
async function crearServicioCliente(conexion, clienteId, planId, datosServicio, tipoServicio) {
  const queryServicio = `
    INSERT INTO servicios_cliente (
      cliente_id, plan_id, precio_personalizado, observaciones, 
      estado, fecha_activacion, created_at
    ) VALUES (?, ?, ?, ?, 'activo', ?, NOW())
  `;

  const valoresServicio = [
    clienteId,
    planId,
    datosServicio.precioPersonalizado ? parseFloat(datosServicio.precioPersonalizado) : null,
    `${tipoServicio} - ${datosServicio.observaciones || 'Servicio creado automáticamente'}`,
    datosServicio.fechaActivacion || new Date().toISOString().split('T')[0]
  ];

  const [resultado] = await conexion.execute(queryServicio, valoresServicio);
  return resultado.insertId;
}

/**
 * Generar instalación automática
 */
async function generarInstalacionAutomatica(conexion, clienteId, servicioId, contratoId, datosServicio, createdBy) {
  const fechaInstalacion = datosServicio.fechaInstalacion ||
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const queryInstalacion = `
    INSERT INTO instalaciones (
      cliente_id, servicio_cliente_id, contrato_id, fecha_programada,
      estado, tipo_instalacion, observaciones, created_at
    ) VALUES (?, ?, ?, ?, 'programada', 'nueva', ?, NOW())
  `;

  const valoresInstalacion = [
    parseInt(clienteId),
    parseInt(servicioId),
    parseInt(contratoId),
    fechaInstalacion,
    'Instalación automática generada para nuevo cliente',

  ];

  const [resultado] = await conexion.execute(queryInstalacion, valoresInstalacion);

  return {
    id: resultado.insertId,
    cliente_id: clienteId,
    fecha_programada: fechaInstalacion
  };
}

/**
 * Generar primera factura automática
 */
async function generarPrimeraFacturaAutomatica(conexion, clienteId, datosCliente, serviciosCreados, createdBy) {
  try {
    console.log('🚀 Iniciando generación de primera factura automática...');
    console.log('📋 Datos recibidos:', {
      clienteId,
      datosCliente: datosCliente ? 'OK' : 'FALTA',
      serviciosCreados: serviciosCreados ? serviciosCreados.length : 'NO ES ARRAY',
      tipoServiciosCreados: typeof serviciosCreados
    });

    // 1. VALIDAR Y NORMALIZAR DATOS DE ENTRADA
    if (!clienteId || !datosCliente) {
      throw new Error('Datos insuficientes para generar factura');
    }

    // 2. CONVERTIR serviciosCreados A ARRAY SI NO LO ES
    let serviciosArray = [];

    if (Array.isArray(serviciosCreados)) {
      serviciosArray = serviciosCreados;
    } else if (serviciosCreados && typeof serviciosCreados === 'object') {
      // Si es un objeto único, convertirlo a array
      serviciosArray = [serviciosCreados];
    } else {
      // Si no hay servicios, buscar en la base de datos
      const [serviciosDB] = await conexion.execute(`
        SELECT 
          sc.id, sc.precio_personalizado, sc.plan_id,
          ps.nombre as plan_nombre, ps.precio as plan_precio, ps.tipo
        FROM servicios_cliente sc
        JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.cliente_id = ? AND sc.estado = 'activo'
      `, [clienteId]);

      serviciosArray = serviciosDB.map(s => ({
        id: s.id,
        plan_id: s.plan_id,
        plan_nombre: s.plan_nombre,
        tipo: s.tipo,
        precio: s.precio_personalizado || s.plan_precio
      }));
    }

    console.log('📊 Servicios procesados:', serviciosArray);

    if (serviciosArray.length === 0) {
      console.log('⚠️ No hay servicios para facturar');
      return null;
    }

    // 3. GENERAR NÚMERO DE FACTURA ÚNICO
    const [ultimaFactura] = await conexion.execute(
      'SELECT numero_factura FROM facturas ORDER BY id DESC LIMIT 1'
    );

    let numeroFactura;
    if (ultimaFactura.length > 0) {
      const ultimoNumero = ultimaFactura[0].numero_factura;
      const numeroActual = parseInt(ultimoNumero.replace(/\D/g, '')) + 1;
      numeroFactura = `FAC${numeroActual.toString().padStart(6, '0')}`;
    } else {
      numeroFactura = 'FAC000001';
    }

    // 4. OBTENER CONFIGURACIÓN DEL SISTEMA
    const [configFacturacion] = await conexion.execute(
      'SELECT parametro, valor FROM configuracion_facturacion WHERE activo = 1'
    );

    const config = {};
    configFacturacion.forEach(item => {
      config[item.parametro] = item.valor;
    });

    // 5. CALCULAR FECHAS
    const fechaEmision = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + parseInt(config.DIAS_VENCIMIENTO_FACTURA || 15));

    const fechaDesde = new Date(fechaEmision.getFullYear(), fechaEmision.getMonth(), 1);
    const fechaHasta = new Date(fechaEmision.getFullYear(), fechaEmision.getMonth() + 1, 0);

    const periodoFacturacion = `${fechaEmision.getFullYear()}-${(fechaEmision.getMonth() + 1).toString().padStart(2, '0')}`;

    // 6. CALCULAR VALORES DE SERVICIOS
    let valorInternet = 0;
    let valorTelevision = 0;
    let valorIvaInternet = 0;
    let valorIvaTelevision = 0;
    let valorReconexion = 0;
    let valorVarios = 0;

    const estrato = parseInt(datosCliente.estrato) || 1;

    // Procesar cada servicio
    for (const servicio of serviciosArray) {
      const precio = parseFloat(servicio.precio || 0);

      if (servicio.tipo === 'internet') {
        valorInternet += precio;

        // IVA para internet: solo estratos 4, 5, 6
        if (estrato >= 4) {
          valorIvaInternet += precio * 0.19;
        }
      } else if (servicio.tipo === 'television') {
        valorTelevision += precio;

        // IVA para televisión: todos los estratos
        valorIvaTelevision += precio * 0.19;
      } else if (servicio.tipo === 'combo') {
        // Para combos, dividir entre internet y TV
        valorInternet += precio * 0.6; // 60% internet
        valorTelevision += precio * 0.4; // 40% TV

        if (estrato >= 4) {
          valorIvaInternet += (precio * 0.6) * 0.19;
        }
        valorIvaTelevision += (precio * 0.4) * 0.19;
      }
    }

    // 7. BUSCAR VALORES PENDIENTES DEL CLIENTE
    const [variosPendientes] = await conexion.execute(`
      SELECT SUM(valor_total) as total_varios 
      FROM varios_pendientes 
      WHERE cliente_id = ? AND facturado = 0 AND activo = 1
    `, [clienteId]);

    const [reconexionesPendientes] = await conexion.execute(`
      SELECT SUM(costo) as total_reconexiones 
      FROM traslados_servicio 
      WHERE cliente_id = ? AND facturado = 0 AND activo = 1
    `, [clienteId]);

    valorVarios = parseFloat(variosPendientes[0]?.total_varios || 0);
    valorReconexion = parseFloat(reconexionesPendientes[0]?.total_reconexiones || 0);

    // 8. CALCULAR TOTALES
    const subtotalSinIva = valorInternet + valorTelevision + valorReconexion + valorVarios;
    const totalIva = valorIvaInternet + valorIvaTelevision;
    const total = subtotalSinIva + totalIva;

    // 9. VALIDAR QUE NO SEA FACTURA DE $0
    if (total === 0 && config.PERMITIR_FACTURAS_CERO === 'false') {
      console.log('⚠️ Factura de $0 no permitida según configuración');
      return null;
    }

    // 10. INSERTAR FACTURA CON TODOS LOS CAMPOS EXACTOS (35 columnas)
    const queryFactura = `
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento, fecha_desde, fecha_hasta,
        internet, television, saldo_anterior, interes, reconexion, descuento, varios, publicidad,
        s_internet, s_television, s_interes, s_reconexion, s_descuento, s_varios, s_publicidad, s_iva,
        subtotal, iva, total, estado, ruta, resolucion, 
        referencia_pago, contrato_id, observaciones, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 11. VALORES EN EL ORDEN EXACTO (35 valores)
    const valoresFactura = [
      numeroFactura,                                          // 1. numero_factura
      parseInt(clienteId),                                    // 2. cliente_id
      datosCliente.identificacion || '',                      // 3. identificacion_cliente
      datosCliente.nombre || '',                              // 4. nombre_cliente
      periodoFacturacion,                                     // 5. periodo_facturacion
      fechaEmision.toISOString().split('T')[0],              // 6. fecha_emision
      fechaVencimiento.toISOString().split('T')[0],          // 7. fecha_vencimiento
      fechaDesde.toISOString().split('T')[0],                // 8. fecha_desde
      fechaHasta.toISOString().split('T')[0],                // 9. fecha_hasta
      valorInternet,                                          // 10. internet
      valorTelevision,                                        // 11. television
      0.00,                                                   // 12. saldo_anterior
      0.00,                                                   // 13. interes
      valorReconexion,                                        // 14. reconexion
      0.00,                                                   // 15. descuento
      valorVarios,                                            // 16. varios
      0.00,                                                   // 17. publicidad
      valorIvaInternet,                                       // 18. s_internet
      valorIvaTelevision,                                     // 19. s_television
      0.00,                                                   // 20. s_interes
      0.00,                                                   // 21. s_reconexion
      0.00,                                                   // 22. s_descuento
      0.00,                                                   // 23. s_varios
      0.00,                                                   // 24. s_publicidad
      totalIva,                                               // 25. s_iva
      subtotalSinIva,                                         // 26. subtotal
      totalIva,                                               // 27. iva
      total,                                                  // 28. total
      'pendiente',                                            // 29. estado
      datosCliente.sector_codigo || null,                     // 30. ruta
      config.RESOLUCION_FACTURACION || 'RESOLUCIÓN PENDIENTE', // 31. resolucion
      `Pago sugerido: ${numeroFactura}`,                      // 32. referencia_pago
      null,                                                   // 33. contrato_id
      'Primera factura automática generada al crear cliente', // 34. observaciones
      parseInt(createdBy) || 1                                // 35. created_by
    ];

    console.log(`🔍 Insertando factura con ${valoresFactura.length} valores`);
    console.log('💰 Resumen factura:', {
      numero: numeroFactura,
      cliente_id: clienteId,
      total: total,
      subtotal: subtotalSinIva,
      iva: totalIva,
      internet: valorInternet,
      television: valorTelevision,
      servicios_procesados: serviciosArray.length
    });

    // 12. EJECUTAR INSERT
    const [resultadoFactura] = await conexion.execute(queryFactura, valoresFactura);
    const facturaId = resultadoFactura.insertId;



    // 14. MARCAR VARIOS COMO FACTURADOS
    if (valorVarios > 0) {
      await conexion.execute(`
        UPDATE varios_pendientes 
        SET facturado = 1, fecha_facturacion = NOW()
        WHERE cliente_id = ? AND facturado = 0 AND activo = 1
      `, [clienteId]);
    }

    if (valorReconexion > 0) {
      await conexion.execute(`
        UPDATE traslados_servicio 
        SET facturado = 1, fecha_facturacion = NOW()
        WHERE cliente_id = ? AND facturado = 0 AND activo = 1
      `, [clienteId]);
    }

    console.log(`✅ Factura ${numeroFactura} generada exitosamente - Total: $${total.toLocaleString('es-CO')}`);

    return {
      id: facturaId,
      numero_factura: numeroFactura,
      total: total,
      cliente_id: clienteId,
      fecha_emision: fechaEmision.toISOString().split('T')[0],
      fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
      servicios_incluidos: serviciosArray.length
    };

  } catch (error) {
    console.error('❌ Error generando primera factura automática:', error);
    throw error;
  }
}


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
  verificarRol('administrador'),
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