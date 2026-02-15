const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Origin recibido:', origin);

    if (!origin) return callback(null, true);

    const defaultOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://45.173.69.5',
      'http://45.173.69.5:3000',
      'http://45.173.69.5:5173',
      'http://45.173.69.5:80',
    ];

    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : defaultOrigins;

    console.log('CORS Orígenes permitidos:', allowedOrigins);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS !== undefined
    ? process.env.CORS_CREDENTIALS === 'true'
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  maxAge: 86400
};

module.exports = corsOptions;