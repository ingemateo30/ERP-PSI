// backend/index.js - SERVIDOR PRINCIPAL COMPLETO Y FUNCIONAL

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

// Validar Content-Type en requests críticos
app.use((req, res, next) => {
  // Solo validar Content-Type en métodos que lo requieren
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');

    // Permitir requests sin body o con Content-Type válido
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

// Logging mejorado
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

// ============================================
// RUTAS DE SALUD Y TESTING
// ============================================

// Health check básico
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ISP Management System API',
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
console.log('👤 Cargando rutas de clientes...');
const clientRoutes = require('./routes/clients');
app.use('/api/v1/clients', clientRoutes);
console.log('✅ Rutas de clientes cargadas: /api/v1/clients');

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

  // Rutas de clientes
  console.log('👤 Cargando rutas de clientes...');
  const clientRoutes = require('./routes/clients');
  app.use('/api/v1/clients', clientRoutes);
  console.log('✅ Rutas de clientes cargadas: /api/v1/clients');

  // Rutas de reportes (si existe)
  try {
    console.log('📊 Cargando rutas de reportes...');
    const reportRoutes = require('./routes/reports');
    app.use('/api/v1/reports', reportRoutes);
    console.log('✅ Rutas de reportes cargadas: /api/v1/reports');
  } catch (error) {
    console.log('⚠️ Rutas de reportes no disponibles (opcional)');
  }

  console.log('✅ Todas las rutas cargadas exitosamente');

} catch (error) {
  console.error('❌ Error cargando rutas:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

// Ruta base de la API con información completa
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Sistema de Gestión ISP - API REST',
    version: 'v1.0.0',
    description: 'API para gestión integral de empresas de servicios de internet y televisión',
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
      conceptos: {
        base: '/api/v1/conceptos',
        endpoints: [
          'GET /api/v1/conceptos',
          'GET /api/v1/conceptos/:id', 
          'POST /api/v1/conceptos',
          'PUT /api/v1/conceptos/:id',
          'DELETE /api/v1/conceptos/:id',
          'GET /api/v1/conceptos/stats',
          'GET /api/v1/conceptos/tipos',
          'GET /api/v1/conceptos/tipo/:tipo',
          'POST /api/v1/conceptos/:id/toggle'
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
    message: '🌐 Sistema de Gestión ISP',
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
      config: 'GET /api/v1/config/overview'
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
console.log('🌟 Sistema de Gestión ISP v1.0.0');
console.log('🏢 Para empresas de servicios de internet y televisión');
console.log('⚡ Desarrollado con Node.js + Express + MySQL\n');

// Iniciar servidor
startServer().catch((error) => {
  console.error('💥 Error fatal durante el inicio:', error);
  process.exit(1);
});

// Exportar app para testing
module.exports = app;