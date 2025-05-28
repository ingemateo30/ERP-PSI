// backend/index.js - SERVIDOR PRINCIPAL COMPLETO

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

console.log('🚀 Iniciando servidor...');

// Verificar variables de entorno críticas
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  console.log('📝 Crea un archivo .env con:');
  console.log('JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro_de_al_menos_32_caracteres');
  console.log('JWT_REFRESH_SECRET=tu_refresh_secret_muy_largo_y_seguro_diferente_al_anterior');
  console.log('DB_HOST=localhost');
  console.log('DB_PORT=3306');
  console.log('DB_USER=root');
  console.log('DB_PASSWORD=');
  console.log('DB_NAME=base_psi');
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

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Validar Content-Type en requests
app.use(validateContentType);

// Logging básico
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`${timestamp} - ${method} ${url} - IP: ${ip}`);
  next();
});

// ============================================
// RUTAS DE SALUD Y TESTING
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Test de base de datos
app.get('/test-db', async (req, res) => {
  try {
    const pool = require('./config/database');
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    res.json({
      status: 'OK',
      message: 'Conexión a base de datos exitosa',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error de conexión a base de datos',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// CARGAR RUTAS PRINCIPALES
// ============================================

try {
  console.log('📂 Cargando rutas de autenticación...');
  const authRoutes = require('./routes/auth');
  app.use('/api/v1/auth', authRoutes);
  console.log('✅ Rutas de autenticación cargadas');

  console.log('📂 Cargando rutas de usuarios...');
  const userRoutes = require('./routes/users');
  app.use('/api/v1/users', userRoutes);
  console.log('✅ Rutas de usuarios cargadas');

  console.log('📂 Cargando rutas de configuración...');
  const configRoutes = require('./routes/config');
  app.use('/api/v1/config', configRoutes);
  console.log('✅ Rutas de configuración cargadas');

  console.log('📂 Cargando rutas de clientes...');
  const clientRoutes = require('./routes/clients');
  app.use('/api/v1/clients', clientRoutes);
  console.log('✅ Rutas de clientes cargadas');
  
} catch (error) {
  console.error('❌ Error cargando rutas:', error.message);
  console.error('Stack:', error.stack);
}

// Ruta base de la API
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'ISP Management System API',
    version: 'v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      config: '/api/v1/config',
      clients: '/api/v1/clients',
      health: '/health',
      testDb: '/test-db'
    }
  });
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error Handler Global
app.use((error, req, res, next) => {
  console.error('💥 Error no controlado:', error.message);
  console.error('Stack:', error.stack);

  // Determinar código de estado
  let statusCode = error.status || error.statusCode || 500;
  
  // Errores específicos
  if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
  }

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? {
      name: error.name,
      stack: error.stack,
      code: error.code
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

async function startServer() {
  try {
    console.log('🔗 Probando conexión a base de datos...');
    
    // Probar conexión a base de datos
    const pool = require('./config/database');
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexión a base de datos exitosa');

    // Verificar estructura de base de datos básica
    try {
      const testConnection = await pool.getConnection();
      const [tables] = await testConnection.execute("SHOW TABLES LIKE 'sistema_usuarios'");
      testConnection.release();
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla sistema_usuarios no encontrada. Ejecuta el script basededatos.sql');
      } else {
        console.log('✅ Estructura de base de datos verificada');
      }
    } catch (dbError) {
      console.log('⚠️  No se pudo verificar la estructura de la base de datos:', dbError.message);
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log('🎉 Servidor iniciado exitosamente');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🆔 PID: ${process.pid}`);
      console.log('\n📋 Endpoints disponibles:');
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   GET  http://localhost:${PORT}/test-db`);
      console.log(`   GET  http://localhost:${PORT}/api/v1`);
      console.log(`   POST http://localhost:${PORT}/api/v1/auth/login`);
      console.log(`   POST http://localhost:${PORT}/api/v1/auth/register`);
      console.log(`   GET  http://localhost:${PORT}/api/v1/config/overview`);
      console.log(`   GET  http://localhost:${PORT}/api/v1/config/company`);
      console.log(`   GET  http://localhost:${PORT}/api/v1/config/banks`);
      console.log(`   GET  http://localhost:${PORT}/api/v1/config/departments`);
      console.log(`   GET  http://localhost:${PORT}/api/v1/config/cities`);
      console.log(`   GET  http://localhost:${PORT}/api/v1/config/sectors`);
      console.log('\n✨ Servidor listo para recibir peticiones!');
    });

    // Configurar timeout del servidor
    server.timeout = 30000;
    
    return server;

  } catch (error) {
    console.error('💥 Error al iniciar servidor:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ No se puede conectar a la base de datos. Verifica:');
      console.error('   - MySQL está ejecutándose');
      console.error('   - Las credenciales en .env son correctas');
      console.error('   - La base de datos existe');
    }
    
    process.exit(1);
  }
}

// ============================================
// MANEJO DE SEÑALES Y EVENTOS
// ============================================

// Manejo de señales del proceso
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido. Cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido. Cerrando servidor gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();