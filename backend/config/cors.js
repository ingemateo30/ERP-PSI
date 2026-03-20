const corsOptions = {
  origin: function (origin, callback) {
    // Requests without Origin (mobile apps, curl, Postman) always allowed
    if (!origin) return callback(null, true);

    const corsOriginEnv = process.env.CORS_ORIGIN;

    // If CORS_ORIGIN is explicitly configured, enforce that whitelist
    if (corsOriginEnv) {
      const allowedOrigins = corsOriginEnv.split(',').map(o => o.trim());
      console.log('CORS check — origin:', origin, '| allowed:', allowedOrigins);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('No permitido por CORS'));
    }

    // No CORS_ORIGIN configured → allow all (internal system, JWT-protected endpoints)
    console.log('CORS — open mode, allowing origin:', origin);
    return callback(null, true);
  },
  credentials: true, // Required for Authorization header + cookies
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
