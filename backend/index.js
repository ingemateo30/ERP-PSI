// backend/index.js - SERVIDOR PRINCIPAL COMPLETO Y FUNCIONAL - VERSIÓN CORREGIDA

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

console.log('🚀 Iniciando Sistema - Backend...');
console.log('📅 Fecha:', new Date().toLocaleString());

// Verificar variables de entorno críticas
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_NAME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  console.log('\n📝 Crea un archivo .env con las siguientes variables:');
  console.log('# Configuración de Base de Datos');
  console.log('DB_HOST=localhost');
  console.log('DB_PORT=3306');
  console.log('DB_USER=root');
  console.log('DB_PASSWORD=');
  console.log('DB_NAME=base_psi');
  console.log('\n# Configuración JWT');
  console.log('JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro_de_al_menos_32_caracteres');
  console.log('JWT_REFRESH_SECRET=tu_refresh_secret_muy_largo_y_seguro_diferente_al_anterior');
  console.log('\n# Configuración del Servidor');
  console.log('NODE_ENV=development');
  console.log('PORT=3000');
  console.log('CORS_ORIGIN=http://localhost:5173,http://localhost:3000');
  process.exit(1);
}

// Verificar longitud de secretos JWT
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET debe tener al menos 32 caracteres para mayor seguridad');
  process.exit(1);
}

if (process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('❌ JWT_REFRESH_SECRET debe tener al menos 32 caracteres para mayor seguridad');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Importar middleware de seguridad
const { securityHeaders, hideServerInfo, validateContentType } = require('./middleware/security');

// ============================================
// MIDDLEWARE BÁSICO
// ============================================

// Comprimir respuestas
app.use(compression());

// Ocultar información del servidor
app.use(hideServerInfo);

// Headers de seguridad
securityHeaders(app);

// CORS configurado
const corsOptions = require('./config/cors');
app.use(cors(corsOptions));

app.use((req, res, next) => {
  // Permitir PATCH específicamente
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');

  // Manejar preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Parsers con límites ajustados
app.use(express.json({
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));
app.use(cookieParser());

app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (req.path.includes('/api/') &&
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type debe ser application/json',
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
});

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  console.log(`${timestamp} - ${method} ${url} - IP: ${ip}`);

  // Log adicional para requests de autenticación
  if (url.includes('/auth/')) {
    console.log(`🔐 Auth request: ${method} ${url}`);
  }

  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'PSI sistema gestion',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node_version: process.version
  });
});

// Test de base de datos detallado
app.get('/test-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const connection = await pool.getConnection();

    // Test básico de conexión
    await connection.ping();

    // Test de lectura
    const [result] = await connection.execute('SELECT NOW() as current_time, VERSION() as mysql_version');

    // Test de tabla principal
    const [tables] = await connection.execute("SHOW TABLES LIKE 'sistema_usuarios'");

    connection.release();

    res.json({
      status: 'OK',
      message: 'Conexión a base de datos exitosa',
      database_time: result[0].current_time,
      mysql_version: result[0].mysql_version,
      tables_found: tables.length > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en test de BD:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error de conexión a base de datos',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de información del sistema
app.get('/system-info', (req, res) => {
  res.json({
    service: 'Sistema PSI',
    version: '1.0.0',
    node_version: process.version,
    platform: process.platform,
    architecture: process.arch,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// CARGAR RUTAS PRINCIPALES
// ============================================

try {
  console.log('📂 Cargando rutas del sistema...');

  // Rutas de autenticación
  console.log('🔐 Cargando rutas de autenticación...');
  const authRoutes = require('./routes/auth');
  app.use('/api/v1/auth', authRoutes);
  console.log('✅ Rutas de autenticación cargadas: /api/v1/auth');

  // Rutas de usuarios
  console.log('👥 Cargando rutas de usuarios...');
  const userRoutes = require('./routes/users');
  app.use('/api/v1/users', userRoutes);
  console.log('✅ Rutas de usuarios cargadas: /api/v1/users');

  // Rutas de configuración
  console.log('⚙️ Cargando rutas de configuración...');
  const configRoutes = require('./routes/config');
  app.use('/api/v1/config', configRoutes);
  console.log('✅ Rutas de configuración cargadas: /api/v1/config');

  console.log('📋 Cargando rutas de conceptos...');
  const conceptosRoutes = require('./routes/conceptos');
  app.use('/api/v1/conceptos', conceptosRoutes);
  console.log('✅ Rutas de conceptos cargadas: /api/v1/conceptos');

  // Rutas de clientes
  console.log('👤 Cargando rutas de clientes...');
  const clientRoutes = require('./routes/clientes');
  app.use('/api/v1/clients', clientRoutes);
  console.log('✅ Rutas de clientes cargadas: /api/v1/clients');

  // Rutas de inventario
  console.log('📦 Cargando rutas de inventario...');
  const inventoryRoutes = require('./routes/inventario');
  app.use('/api/v1/inventory', inventoryRoutes);
  console.log('✅ Rutas de inventario cargadas: /api/v1/inventory');

  // Rutas de plantillas de correo
  console.log('📧 Cargando rutas de plantillas de correo...');
  const plantillasCorreoRoutes = require('./routes/plantillasCorreo');
  app.use('/api/v1/config/plantillas-correo', plantillasCorreoRoutes);
  console.log('✅ Rutas de plantillas de correo cargadas: /api/v1/config/plantillas-correo');


  console.log('💰 Cargando rutas de facturas...');
  const facturasRoutes = require('./routes/factura');
  app.use('/api/v1/facturas', facturasRoutes);
  console.log('✅ Rutas de facturas cargadas: /api/v1/facturas');

  // CORREGIDO: Rutas de reportes regulatorios
  console.log('📊 Cargando rutas de reportes regulatorios...');
  const reportesRegulatoriosRoutes = require('./routes/reportesRegulatorios');
  app.use('/api/v1/reportes-regulatorios', reportesRegulatoriosRoutes);
  console.log('✅ Rutas de reportes regulatorios cargadas: /api/v1/reportes-regulatorios');

  // Rutas de PQR
  console.log('📝 Cargando rutas de PQR...');
  const pqrRoutes = require('./routes/pqr');
  app.use('/api/v1/pqr', pqrRoutes);
  console.log('✅ Rutas de PQR cargadas: /api/v1/pqr');

  // Rutas de incidencias
  console.log('🚨 Cargando rutas de incidencias...');
  const incidenciasRoutes = require('./routes/incidencias');
  app.use('/api/v1/incidencias', incidenciasRoutes);
  console.log('✅ Rutas de incidencias cargadas: /api/v1/incidencias');

  //rutas de instalaciones
  console.log('🔧 Cargando rutas de instalaciones...');
  const instalacionesRoutes = require('./routes/instalaciones');
  const inventarioRoutes = require('./routes/inventario'); // ← AGREGAR ESTA LÍNEA
app.use('/api/inventario', inventarioRoutes); 
  app.use('/api/v1/instalaciones', instalacionesRoutes);

  const CronJobs = require('./utils/cronJobs');

  console.log('🧾 Cargando rutas de facturación automática...');
  const facturacionRoutes = require('./routes/facturacion');
  app.use('/api/v1/facturacion', facturacionRoutes);
  console.log('✅ Rutas de facturación automática cargadas: /api/v1/facturacion');

  console.log('🕐 Configurando sistema de facturación automática...');


  console.log('📋 Cargando rutas de contratos...');
  const contratosRoutes = require('./routes/contratos');
  app.use('/api/v1/contratos', contratosRoutes);
  console.log('✅ Rutas de contratos cargadas: /api/v1/contratos');

  console.log('🧾 Cargando rutas de cliente completo...');
  const Clientecompleto = require('./routes/clienteCompleto');
  app.use('/api/v1/clientes-completo', Clientecompleto);
  console.log('✅ Rutas de cliente completo cargadas: /api/v1/clientes-completo');

console.log('💾 Cargando rutas de sistema (backups)...');
const sistema = require('./routes/sistema');
app.use('/api/v1/sistema', sistema);
console.log('✅ Rutas de sistema cargadas: /api/v1/sistema');
console.log('👷 Cargando rutas de instalador...');
const instaladorRoutes = require('./routes/instalador');
app.use('/api/v1/instalador', instaladorRoutes);
console.log('✅ Rutas de instalador cargadas: /api/v1/instalador');

  const inicializarFacturacionAutomatica = () => {
    const cronEnabled = process.env.NODE_ENV === 'production' ||
      process.env.FACTURACION_CRON_ENABLED === 'true';

    if (cronEnabled) {
      try {
        console.log('⚙️ Inicializando tareas programadas de facturación...');
        CronJobs.inicializar();
        console.log('✅ Tareas programadas de facturación configuradas');
        console.log('   📅 Facturación mensual: Día 1 de cada mes a las 06:00');
        console.log('   🔄 Actualización estados: Diario a las 02:00');
        console.log('   💰 Cálculo intereses: Diario a las 03:00');
        console.log('   📧 Notificaciones: Diario a las 08:00');
        console.log('   💾 Backup diario: Diario a las 01:00');
        console.log('   🧹 Limpieza: Domingos a las 04:00');
        console.log('   📊 Reportes: Día 2 de cada mes a las 07:00');
      } catch (cronError) {
        console.warn('⚠️ Error configurando tareas programadas:', cronError.message);
        console.warn('💡 El sistema funcionará sin automatización. Para habilitar: FACTURACION_CRON_ENABLED=true');
      }
    } else {
      console.log('ℹ️ Tareas programadas de facturación deshabilitadas');
      console.log('💡 Para habilitar en desarrollo: FACTURACION_CRON_ENABLED=true en .env');
      console.log('🔧 Facturación manual disponible en /api/v1/facturacion');
    }
  };

  // Llamar después de configurar la base de datos
  inicializarFacturacionAutomatica();

  // Rutas de reportes (si existe)
  try {
    console.log('📈 Cargando rutas de reportes generales...');
    const reportRoutes = require('./routes/reports');
    app.use('/api/v1/reports', reportRoutes);
    console.log('✅ Rutas de reportes generales cargadas: /api/v1/reports');
  } catch (error) {
    console.log('⚠️ Rutas de reportes generales no disponibles (opcional)');
  }

  console.log('✅ Todas las rutas cargadas exitosamente');
 console.log('📊 Cargando rutas de estadísticas...');
  const estadisticasRoutes = require('./routes/estadisticas'); // ✅ BIEN (dentro del try)
  app.use('/api/v1/estadisticas', estadisticasRoutes);
  console.log('✅ Rutas de estadísticas cargadas: /api/v1/estadisticas');

} catch (error) {
  console.error('❌ Error cargando rutas:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

// Ruta base de la API con información completa
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Sistema de Gestión PSI - API REST',
    version: 'v1.0.0',
    description: 'API para gestión integral de PSI',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: {
        base: '/api/v1/auth',
        endpoints: [
          'POST /api/v1/auth/login',
          'POST /api/v1/auth/register',
          'POST /api/v1/auth/logout',
          'POST /api/v1/auth/refresh',
          'GET /api/v1/auth/verify',
          'GET /api/v1/auth/me',
          'POST /api/v1/auth/change-password'
        ]
      },
      users: {
        base: '/api/v1/users',
        endpoints: [
          'GET /api/v1/users',
          'GET /api/v1/users/:id',
          'POST /api/v1/users',
          'PUT /api/v1/users/:id',
          'GET /api/v1/users/profile',
          'PUT /api/v1/users/profile',
          'POST /api/v1/users/change-password',
          'GET /api/v1/users/stats'
        ]
      },
      configuration: {
        base: '/api/v1/config',
        endpoints: [
          'GET /api/v1/config/overview',
          'GET /api/v1/config/company',
          'PUT /api/v1/config/company',
          'GET /api/v1/config/departments',
          'GET /api/v1/config/cities',
          'GET /api/v1/config/sectors',
          'GET /api/v1/config/banks',
          'GET /api/v1/config/service-plans',
          'GET /api/v1/config/stats'
        ]
      },
      clients: {
        base: '/api/v1/clients',
        endpoints: [
          'GET /api/v1/clients',
          'GET /api/v1/clients/:id',
          'POST /api/v1/clients',
          'PUT /api/v1/clients/:id',
          'GET /api/v1/clients/stats'
        ]
      },
      inventory: {
        base: '/api/v1/inventory',
        endpoints: [
          'GET /api/v1/inventory/equipment',
          'GET /api/v1/inventory/equipment/:id',
          'POST /api/v1/inventory/equipment',
          'PUT /api/v1/inventory/equipment/:id',
          'DELETE /api/v1/inventory/equipment/:id',
          'POST /api/v1/inventory/equipment/:id/assign',
          'POST /api/v1/inventory/equipment/:id/return',
          'POST /api/v1/inventory/equipment/:id/install',
          'PUT /api/v1/inventory/equipment/:id/location',
          'GET /api/v1/inventory/installer/:instaladorId/equipment',
          'GET /api/v1/inventory/equipment/:id/history',
          'GET /api/v1/inventory/installer/:instaladorId/history',
          'GET /api/v1/inventory/stats',
          'GET /api/v1/inventory/reports/date-range',
          'GET /api/v1/inventory/available',
          'GET /api/v1/inventory/installers',
          'GET /api/v1/inventory/search',
          'GET /api/v1/inventory/types',
          'GET /api/v1/inventory/types/:tipo/brands',
          'GET /api/v1/inventory/check-code/:codigo'
        ]
      },
      reportes_regulatorios: {
        base: '/api/reportes-regulatorios',
        endpoints: [
          'GET /api/reportes-regulatorios/disponibles',
          'GET /api/reportes-regulatorios/suscriptores-tv',
          'GET /api/reportes-regulatorios/planes-tarifarios',
          'GET /api/reportes-regulatorios/lineas-valores',
          'GET /api/reportes-regulatorios/disponibilidad-qos',
          'GET /api/reportes-regulatorios/monitoreo-quejas',
          'GET /api/reportes-regulatorios/indicadores-quejas',
          'GET /api/reportes-regulatorios/facturas-ventas'
        ]
      },
      pqr: {
        base: '/api/pqr',
        endpoints: [
          'GET /api/pqr',
          'GET /api/pqr/:id',
          'POST /api/pqr',
          'PUT /api/pqr/:id',
          'DELETE /api/pqr/:id',
          'GET /api/pqr/estadisticas',
          'POST /api/pqr/:id/asignar',
          'GET /api/pqr/cliente/:clienteId',
          'GET /api/pqr/reportes/crc'
        ]
      },
      incidencias: {
        base: '/api/incidencias',
        endpoints: [
          'GET /api/incidencias',
          'GET /api/incidencias/:id',
          'POST /api/incidencias',
          'PUT /api/incidencias/:id',
          'POST /api/incidencias/:id/cerrar',
          'GET /api/incidencias/estadisticas',
          'GET /api/incidencias/activas/resumen'
        ]
      },
      system: {
        base: '/',
        endpoints: [
          'GET /health',
          'GET /test-db',
          'GET /system-info'
        ]
      }
    },
    contact: {
      support: 'Soporte técnico disponible',
      documentation: 'Documentación en desarrollo'
    }
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🌐 Sistema de Gestión PSI',
    status: 'Operativo',
    version: '1.0.0',
    api_base: '/api/v1',
    health_check: '/health',
    database_test: '/test-db',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 Handler para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    requested_path: req.originalUrl,
    method: req.method,
    available_endpoints: {
      api_info: 'GET /api/v1',
      health: 'GET /health',
      auth: 'POST /api/v1/auth/login',
      config: 'GET /api/v1/config/overview',
      reportes_regulatorios: 'GET /api/reportes-regulatorios/disponibles'
    },
    timestamp: new Date().toISOString()
  });
});

// Error Handler Global
app.use((error, req, res, next) => {
  console.error('💥 Error no controlado:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('URL:', req.originalUrl);
  console.error('Method:', req.method);
  console.error('Headers:', req.headers);

  // Determinar código de estado
  let statusCode = error.status || error.statusCode || 500;
  let message = error.message || 'Error interno del servidor';

  // Errores específicos de base de datos
  if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Registro duplicado';
  } else if (error.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    message = 'Error de configuración de base de datos';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 500;
    message = 'Error de conexión a base de datos';
  }

  // Errores de validación
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Datos de entrada inválidos';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'No autorizado';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  const errorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // En desarrollo, incluir más detalles del error
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = {
      name: error.name,
      stack: error.stack,
      code: error.code
    };
  }

  res.status(statusCode).json(errorResponse);
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

async function startServer() {
  try {
    console.log('🔗 Verificando conexión a base de datos...');

    // Probar conexión a base de datos
    const pool = require('./config/database');
    const connection = await pool.getConnection();
    await connection.ping();

    // Verificar estructura de base de datos básica
    console.log('🔍 Verificando estructura de base de datos...');

    const requiredTables = [
      'sistema_usuarios',
      'configuracion_empresa',
      'departamentos',
      'ciudades',
      'sectores',
      'bancos',
      'planes_servicio'
    ];

    const missingTables = [];

    for (const table of requiredTables) {
      const [tables] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (tables.length === 0) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log('⚠️  Tablas faltantes en la base de datos:', missingTables.join(', '));
      console.log('📝 Ejecuta el script basededatos.sql para crear las tablas necesarias');
    } else {
      console.log('✅ Todas las tablas requeridas están presentes');
    }

    // Verificar usuario administrador por defecto
    console.log('👑 Verificando usuario administrador...');
    const [adminUsers] = await connection.execute(
      "SELECT id, email FROM sistema_usuarios WHERE rol = 'administrador' AND activo = 1 LIMIT 1"
    );

    if (adminUsers.length === 0) {
      console.log('⚠️  No se encontró usuario administrador activo');
      console.log('💡 Puedes crear uno usando POST /api/v1/auth/register con rol "administrador"');
    } else {
      console.log('✅ Usuario administrador encontrado:', adminUsers[0].email);
    }

    connection.release();
    console.log('✅ Conexión a base de datos verificada exitosamente');

    // Verificar configuración de la empresa
    console.log('🏢 Verificando configuración de empresa...');
    try {
      const testConnection = await pool.getConnection();
      const [companyConfig] = await testConnection.execute(
        'SELECT empresa_nombre, empresa_nit FROM configuracion_empresa LIMIT 1'
      );

      if (companyConfig.length === 0 || !companyConfig[0].empresa_nombre) {
        console.log('⚠️  Configuración de empresa pendiente');
        console.log('⚙️  Configura la empresa en /api/v1/config/company');
      } else {
        console.log('✅ Empresa configurada:', companyConfig[0].empresa_nombre);
      }

      testConnection.release();
    } catch (configError) {
      console.log('⚠️  No se pudo verificar configuración de empresa:', configError.message);
    }

    // Iniciar servidor HTTP
    console.log('🚀 Iniciando servidor HTTP...');

    const server = app.listen(PORT, () => {
      console.log('\n🎉 ¡Servidor iniciado exitosamente!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 URL Base: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🆔 PID: ${process.pid}`);
      console.log(`💾 Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      console.log(`⏰ Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      console.log('\n📋 Endpoints principales:');
      console.log('   🔍 Estado del sistema:');
      console.log(`      GET  http://localhost:${PORT}/health`);
      console.log(`      GET  http://localhost:${PORT}/test-db`);
      console.log(`      GET  http://localhost:${PORT}/system-info`);

      console.log('   📡 API Principal:');
      console.log(`      GET  http://localhost:${PORT}/api/v1`);

      console.log('   🔐 Autenticación:');
      console.log(`      POST http://localhost:${PORT}/api/v1/auth/login`);
      console.log(`      POST http://localhost:${PORT}/api/v1/auth/register`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/auth/me`);

      console.log('   📊 Reportes Regulatorios:');
      console.log(`      GET  http://localhost:${PORT}/api/reportes-regulatorios/disponibles`);
      console.log(`      GET  http://localhost:${PORT}/api/reportes-regulatorios/suscriptores-tv`);
      console.log(`      GET  http://localhost:${PORT}/api/reportes-regulatorios/planes-tarifarios`);

      console.log('   👥 Gestión de usuarios:');
      console.log(`      GET  http://localhost:${PORT}/api/v1/users/profile`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/users/stats`);

      console.log('   ⚙️ Configuración:');
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/overview`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/company`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/departments`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/cities`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/sectors`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/banks`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/config/service-plans`);

      console.log('   👤 Clientes:');
      console.log(`      GET  http://localhost:${PORT}/api/v1/clients`);
      console.log(`      GET  http://localhost:${PORT}/api/v1/clients/stats`);

      console.log('\n🛠️ Para desarrollo:');
      console.log('   • Variables de entorno: verificar archivo .env');
      console.log('   • Base de datos: ejecutar basededatos.sql si es necesario');
      console.log('   • CORS configurado para:', process.env.CORS_ORIGIN || 'localhost');

      console.log('\n🔑 Credenciales por defecto:');
      console.log('   • Email: admin@empresa.com');
      console.log('   • Contraseña: (configurar en registro inicial)');

      console.log('\n✨ ¡Sistema listo para recibir peticiones!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Configurar timeout del servidor
    server.timeout = 30000; // 30 segundos
    server.keepAliveTimeout = 65000; // 65 segundos
    server.headersTimeout = 66000; // 66 segundos

    // Manejar conexiones activas para cierre graceful
    const connections = new Set();

    server.on('connection', (connection) => {
      connections.add(connection);
      connection.on('close', () => {
        connections.delete(connection);
      });
    });

    // Función de cierre graceful
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Señal ${signal} recibida. Iniciando cierre graceful...`);

      server.close((err) => {
        if (err) {
          console.error('❌ Error cerrando servidor:', err);
          process.exit(1);
        }

        console.log('✅ Servidor HTTP cerrado');

        // Cerrar conexiones activas
        connections.forEach((connection) => {
          connection.destroy();
        });

        // Cerrar pool de base de datos
        if (pool) {
          pool.end().then(() => {
            console.log('✅ Pool de base de datos cerrado');
            console.log('👋 ¡Hasta luego!');
            process.exit(0);
          }).catch((poolError) => {
            console.error('❌ Error cerrando pool de BD:', poolError);
            process.exit(1);
          });
        } else {
          console.log('👋 ¡Hasta luego!');
          process.exit(0);
        }
      });
    };

    // Registrar manejadores de señales
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;

  } catch (error) {
    console.error('💥 Error fatal al iniciar servidor:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);

    // Diagnósticos específicos
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔍 Diagnóstico:');
      console.error('❌ No se puede conectar a la base de datos');
      console.error('✅ Verificaciones necesarias:');
      console.error('   • MySQL/MariaDB está ejecutándose');
      console.error('   • Las credenciales en .env son correctas');
      console.error('   • La base de datos existe');
      console.error('   • El puerto de BD está disponible');
    } else if (error.code === 'EADDRINUSE') {
      console.error('\n🔍 Diagnóstico:');
      console.error(`❌ El puerto ${PORT} ya está en uso`);
      console.error('✅ Soluciones:');
      console.error('   • Cambiar PORT en .env');
      console.error('   • Cerrar la aplicación que usa el puerto');
      console.error('   • Usar: npx kill-port 3000');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔍 Diagnóstico:');
      console.error('❌ Credenciales de base de datos incorrectas');
      console.error('✅ Verificar en .env:');
      console.error('   • DB_USER');
      console.error('   • DB_PASSWORD');
      console.error('   • DB_HOST');
    }

    process.exit(1);
  }
}

// ============================================
// MANEJO DE EVENTOS DEL PROCESO
// ============================================

// Manejar promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection:');
  console.error('Reason:', reason);
  console.error('Promise:', promise);

  // En producción, podríamos querer reiniciar el proceso
  if (process.env.NODE_ENV === 'production') {
    console.error('🔄 Reiniciando proceso debido a error crítico...');
    process.exit(1);
  }
});

// Manejar excepciones no capturadas
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);

  // Las excepciones no capturadas requieren reinicio
  console.error('🔄 Proceso debe reiniciarse debido a excepción no capturada');
  process.exit(1);
});

// Manejar advertencias
process.on('warning', (warning) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Warning:', warning.name);
    console.warn('Message:', warning.message);
    console.warn('Stack:', warning.stack);
  }
});

// Información de memoria periódica (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const mbUsed = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (mbUsed > 100) { // Solo loggear si usa más de 100MB
      console.log(`📊 Memoria: ${mbUsed}MB usado de ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    }
  }, 60000); // Cada minuto
}

// ============================================
// INICIAR APLICACIÓN
// ============================================

// Mensaje de bienvenida
console.log('🌟 Sistema de Gestión PSI v1.0.0');


// Iniciar servidor
startServer().catch((error) => {
  console.error('💥 Error fatal durante el inicio:', error);
  process.exit(1);
});

// Exportar app para testing
module.exports = app;