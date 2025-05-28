// Importar y usar rutas
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
  
} catch (error) {
  console.error('❌ Error cargando rutas:', error.message);// backend/index.js - VERSIÓN SIMPLIFICADA PARA DEBUGGING

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

console.log('🚀 Iniciando servidor...');

// Verificar variables de entorno críticas
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  console.log('📝 Crea un archivo .env con:');
  console.log('JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro_de_al_menos_32_caracteres');
  console.log('JWT_REFRESH_SECRET=tu_refresh_secret_muy_largo_y_seguro_diferente_al_anterior');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE BÁSICO
// ============================================

// CORS básico
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging básico
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================
// RUTAS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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
      message: 'Conexión a base de datos exitosa'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error de conexión a base de datos',
      error: error.message
    });
  }
});

  console.log('✅ Rutas de configuración cargadas');
  

// Ruta base de la API
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'ISP Management System API',
    version: 'v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth',
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
    method: req.method
  });
});

// Error Handler Global
app.use((error, req, res, next) => {
  console.error('💥 Error no controlado:', error.message);
  console.error('Stack:', error.stack);

  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
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

    // Iniciar servidor
    app.listen(PORT, () => {
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
      console.log('\n✨ Servidor listo para recibir peticiones!');
    });

  } catch (error) {
    console.error('💥 Error al iniciar servidor:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Manejo de señales del proceso
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();}