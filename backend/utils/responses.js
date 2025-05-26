/**
 * Utilidades para respuestas estandarizadas de la API
 */

class ApiResponse {
  /**
   * Respuesta exitosa genérica
   */
  static success(res, data = null, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de error genérica
   */
  static error(res, message = 'Error interno del servidor', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
      response.stack = new Error().stack;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Respuesta de validación fallida
   */
  static validationError(res, errors, message = 'Datos de entrada inválidos') {
    return res.status(400).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de no autorizado
   */
  static unauthorized(res, message = 'No autorizado') {
    return res.status(401).json({
      success: false,
      message,
      error: {
        code: 'UNAUTHORIZED',
        description: 'Token de acceso requerido o inválido'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de acceso prohibido
   */
  static forbidden(res, message = 'Acceso prohibido') {
    return res.status(403).json({
      success: false,
      message,
      error: {
        code: 'FORBIDDEN',
        description: 'No tienes permisos para acceder a este recurso'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de recurso no encontrado
   */
  static notFound(res, message = 'Recurso no encontrado') {
    return res.status(404).json({
      success: false,
      message,
      error: {
        code: 'NOT_FOUND',
        description: 'El recurso solicitado no existe'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de conflicto (ej: email duplicado)
   */
  static conflict(res, message = 'Conflicto de datos') {
    return res.status(409).json({
      success: false,
      message,
      error: {
        code: 'CONFLICT',
        description: 'Los datos enviados entran en conflicto con los existentes'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de límite de tasa excedido
   */
  static rateLimitExceeded(res, message = 'Demasiadas solicitudes') {
    return res.status(429).json({
      success: false,
      message,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        description: 'Has excedido el límite de solicitudes permitidas'
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de login exitoso
   */
  static loginSuccess(res, user, tokens) {
    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          telefono: user.telefono,
          rol: user.rol,
          ultimo_acceso: user.ultimo_acceso
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de logout exitoso
   */
  static logoutSuccess(res) {
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de token renovado
   */
  static tokenRefreshed(res, tokens) {
    return res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de perfil obtenido
   */
  static profileSuccess(res, user) {
    return res.status(200).json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          telefono: user.telefono,
          rol: user.rol,
          ultimo_acceso: user.ultimo_acceso,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de creación exitosa
   */
  static created(res, data, message = 'Recurso creado exitosamente') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de actualización exitosa
   */
  static updated(res, data = null, message = 'Recurso actualizado exitosamente') {
    return res.status(200).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Respuesta de eliminación exitosa
   */
  static deleted(res, message = 'Recurso eliminado exitosamente') {
    return res.status(200).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;