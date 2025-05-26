const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Formato para consola
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Configuración del logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Log general
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 10485760, // 10MB
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5,
      tailable: true
    }),
    
    // Log de acceso
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'info',
      maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 10485760, // 10MB
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5,
      tailable: true
    }),
    
    // Log de autenticación
    new winston.transports.File({
      filename: path.join(logsDir, 'auth.log'),
      level: 'info',
      maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 10485760, // 10MB
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Agregar consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: consoleFormat
  }));
}

// Método especializado para logs de autenticación
logger.logAuth = function(level, message, meta = {}) {
  this.log({
    level,
    message,
    type: 'auth',
    timestamp: new Date().toISOString(),
    ...meta
  });
};

// Método especializado para logs de acceso
logger.logAccess = function(req, res, responseTime) {
  this.info('HTTP Request', {
    type: 'access',
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    contentLength: res.get('Content-Length'),
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    timestamp: new Date().toISOString()
  });
};

// Método para logs de seguridad
logger.logSecurity = function(level, message, meta = {}) {
  this.log({
    level,
    message,
    type: 'security',
    timestamp: new Date().toISOString(),
    ...meta
  });
};

module.exports = logger;