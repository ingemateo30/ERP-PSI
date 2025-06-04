// Validaciones para el módulo de clientes

/**
 * Validar cédula colombiana
 */
function validarCedulaColombiana(cedula) {
  if (!cedula || typeof cedula !== 'string') return false;
  
  // Remover puntos y comas
  cedula = cedula.replace(/[.,]/g, '');
  
  // Verificar que solo contenga números
  if (!/^\d+$/.test(cedula)) return false;
  
  // Verificar longitud (6-10 dígitos)
  if (cedula.length < 6 || cedula.length > 10) return false;
  
  return true;
}

/**
 * Validar NIT colombiano
 */
function validarNitColombiano(nit) {
  if (!nit || typeof nit !== 'string') return false;
  
  // Remover puntos, comas y guiones
  nit = nit.replace(/[.,-]/g, '');
  
  // Verificar formato básico
  if (!/^\d{9,10}$/.test(nit)) return false;
  
  return true;
}

/**
 * Validar teléfono colombiano
 */
function validarTelefonoColombiano(telefono) {
  if (!telefono || typeof telefono !== 'string') return false;
  
  // Remover espacios, guiones y paréntesis
  telefono = telefono.replace(/[\s\-()]/g, '');
  
  // Verificar que solo contenga números
  if (!/^\d+$/.test(telefono)) return false;
  
  // Verificar formatos válidos para Colombia
  // Móvil: 10 dígitos (3xxxxxxxxx)
  // Fijo: 7 dígitos (xxxxxxx) o 10 dígitos con indicativo
  if (telefono.length === 10 && telefono.startsWith('3')) return true;
  if (telefono.length === 7) return true;
  if (telefono.length === 10 && /^[1-8]/.test(telefono)) return true;
  
  return false;
}

/**
 * Validar email
 */
function validarEmail(email) {
  if (!email) return true; // Email es opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar dirección MAC
 */
function validarMAC(mac) {
  if (!mac) return true; // MAC es opcional
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
}

/**
 * Validar dirección IP
 */
function validarIP(ip) {
  if (!ip) return true; // IP es opcional
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Middleware de validación para crear cliente
 */
function validarCrearCliente(req, res, next) {
  const errores = [];
  const { 
    identificacion, 
    tipo_documento, 
    nombre, 
    direccion,
    telefono,
    telefono_2,
    correo,
    estrato,
    mac_address,
    ip_asignada,
    estado
  } = req.body;

  // Validaciones requeridas
  if (!identificacion || identificacion.trim().length === 0) {
    errores.push('La identificación es requerida');
  } else if (identificacion.length < 5 || identificacion.length > 20) {
    errores.push('La identificación debe tener entre 5 y 20 caracteres');
  } else if (!/^[0-9A-Za-z-]+$/.test(identificacion)) {
    errores.push('La identificación solo puede contener números, letras y guiones');
  }

  if (!nombre || nombre.trim().length === 0) {
    errores.push('El nombre es requerido');
  } else if (nombre.length < 2 || nombre.length > 255) {
    errores.push('El nombre debe tener entre 2 y 255 caracteres');
  } else if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/.test(nombre)) {
    errores.push('El nombre solo puede contener letras y espacios');
  }

  if (!direccion || direccion.trim().length === 0) {
    errores.push('La dirección es requerida');
  } else if (direccion.length < 5 || direccion.length > 500) {
    errores.push('La dirección debe tener entre 5 y 500 caracteres');
  }

  // Validaciones opcionales
  if (tipo_documento && !['cedula', 'nit', 'pasaporte', 'extranjeria'].includes(tipo_documento)) {
    errores.push('Tipo de documento inválido');
  }

  if (telefono && !validarTelefonoColombiano(telefono)) {
    errores.push('Número de teléfono principal inválido para Colombia');
  }

  if (telefono_2 && !validarTelefonoColombiano(telefono_2)) {
    errores.push('Número de teléfono secundario inválido para Colombia');
  }

  if (correo && !validarEmail(correo)) {
    errores.push('Correo electrónico inválido');
  }

  if (estrato && !['1', '2', '3', '4', '5', '6'].includes(estrato)) {
    errores.push('Estrato inválido (debe ser 1-6)');
  }

  if (mac_address && !validarMAC(mac_address)) {
    errores.push('Dirección MAC inválida');
  }

  if (ip_asignada && !validarIP(ip_asignada)) {
    errores.push('Dirección IP inválida');
  }

  if (estado && !['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'].includes(estado)) {
    errores.push('Estado inválido');
  }

  // Validaciones de negocio
  if (ip_asignada && !mac_address) {
    errores.push('Si se asigna IP, también se debe proporcionar la dirección MAC');
  }

  // Validar tipo de documento vs identificación
  if (tipo_documento === 'cedula' && identificacion && !validarCedulaColombiana(identificacion)) {
    errores.push('Número de cédula inválido');
  }

  if (tipo_documento === 'nit' && identificacion && !validarNitColombiano(identificacion)) {
    errores.push('Número de NIT inválido');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errores
    });
  }

  // Limpiar y normalizar datos
  if (req.body.identificacion) {
    req.body.identificacion = req.body.identificacion.trim();
  }
  if (req.body.nombre) {
    req.body.nombre = req.body.nombre.trim();
  }
  if (req.body.direccion) {
    req.body.direccion = req.body.direccion.trim();
  }
  if (req.body.telefono) {
    req.body.telefono = req.body.telefono.replace(/\D/g, '');
  }
  if (req.body.telefono_2) {
    req.body.telefono_2 = req.body.telefono_2.replace(/\D/g, '');
  }
  if (req.body.correo) {
    req.body.correo = req.body.correo.toLowerCase().trim();
  }

  next();
}

/**
 * Middleware de validación para actualizar cliente
 */
function validarActualizarCliente(req, res, next) {
  const errores = [];
  const { 
    identificacion, 
    tipo_documento, 
    nombre, 
    direccion,
    telefono,
    telefono_2,
    correo,
    estrato,
    mac_address,
    ip_asignada,
    estado
  } = req.body;

  // Validaciones opcionales (solo si se proporcionan)
  if (identificacion !== undefined) {
    if (!identificacion || identificacion.trim().length === 0) {
      errores.push('La identificación no puede estar vacía');
    } else if (identificacion.length < 5 || identificacion.length > 20) {
      errores.push('La identificación debe tener entre 5 y 20 caracteres');
    } else if (!/^[0-9A-Za-z-]+$/.test(identificacion)) {
      errores.push('La identificación solo puede contener números, letras y guiones');
    }
  }

  if (nombre !== undefined) {
    if (!nombre || nombre.trim().length === 0) {
      errores.push('El nombre no puede estar vacío');
    } else if (nombre.length < 2 || nombre.length > 255) {
      errores.push('El nombre debe tener entre 2 y 255 caracteres');
    } else if (!/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/.test(nombre)) {
      errores.push('El nombre solo puede contener letras y espacios');
    }
  }

  if (direccion !== undefined) {
    if (!direccion || direccion.trim().length === 0) {
      errores.push('La dirección no puede estar vacía');
    } else if (direccion.length < 5 || direccion.length > 500) {
      errores.push('La dirección debe tener entre 5 y 500 caracteres');
    }
  }

  if (tipo_documento && !['cedula', 'nit', 'pasaporte', 'extranjeria'].includes(tipo_documento)) {
    errores.push('Tipo de documento inválido');
  }

  if (telefono && !validarTelefonoColombiano(telefono)) {
    errores.push('Número de teléfono principal inválido para Colombia');
  }

  if (telefono_2 && !validarTelefonoColombiano(telefono_2)) {
    errores.push('Número de teléfono secundario inválido para Colombia');
  }

  if (correo && !validarEmail(correo)) {
    errores.push('Correo electrónico inválido');
  }

  if (estrato && !['1', '2', '3', '4', '5', '6'].includes(estrato)) {
    errores.push('Estrato inválido (debe ser 1-6)');
  }

  if (mac_address && !validarMAC(mac_address)) {
    errores.push('Dirección MAC inválida');
  }

  if (ip_asignada && !validarIP(ip_asignada)) {
    errores.push('Dirección IP inválida');
  }

  if (estado && !['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'].includes(estado)) {
    errores.push('Estado inválido');
  }

  // Validaciones de negocio
  if (ip_asignada && !mac_address && !req.body.mac_address) {
    errores.push('Si se asigna IP, también se debe proporcionar la dirección MAC');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errores
    });
  }

  // Limpiar y normalizar datos
  if (req.body.identificacion) {
    req.body.identificacion = req.body.identificacion.trim();
  }
  if (req.body.nombre) {
    req.body.nombre = req.body.nombre.trim();
  }
  if (req.body.direccion) {
    req.body.direccion = req.body.direccion.trim();
  }
  if (req.body.telefono) {
    req.body.telefono = req.body.telefono.replace(/\D/g, '');
  }
  if (req.body.telefono_2) {
    req.body.telefono_2 = req.body.telefono_2.replace(/\D/g, '');
  }
  if (req.body.correo) {
    req.body.correo = req.body.correo.toLowerCase().trim();
  }

  next();
}

module.exports = {
  validarCrearCliente,
  validarActualizarCliente,
  validarCedulaColombiana,
  validarNitColombiano,
  validarTelefonoColombiano,
  validarEmail,
  validarMAC,
  validarIP
};