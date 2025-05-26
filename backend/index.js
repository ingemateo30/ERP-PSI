require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Importar configuraciones
const corsConfig = require('./config/cors');
const logger = require('./utils/logger');
const { connectDatabase } = require('./models/Database');

// Importar middleware
const securityMiddleware = require('./middleware/security');
const rateLimiter = require('./middleware/rateLimiter');

// Importar rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE DE SEGURIDAD
// ============================================

// Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors(corsConfig));

// Compresión
app.use(compression());

// Rate limiting global
app.use(rateLimiter.globalLimiter);

// ============================================
// MIDDLEWARE DE PARSEO
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
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
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use(`/api/${process.env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION}/users`, userRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 Handler
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    error: {
      status: 404,
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Error Handler Global
app.use((error, req, res, next) => {
  logger.error('Error no controlado:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // No revelar detalles del error en producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: isDevelopment ? error.message : 'Error interno del servidor',
    error: {
      status: error.status || 500,
      ...(isDevelopment && { stack: error.stack })
    }
  });
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    logger.info('Conexión a base de datos establecida');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`Servidor iniciado en puerto ${PORT}`, {
        environment: process.env.NODE_ENV,
        pid: process.pid
      });
    });

  } catch (error) {
    logger.error('Error al iniciar servidor:', error.message);
    process.exit(1);
  }
}

// Manejo de señales del proceso
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();
