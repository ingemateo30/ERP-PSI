const bcrypt = require('bcryptjs');
const logger = require('./logger');

/**
 * Utilidades para el manejo seguro de contraseñas
 */
class PasswordUtils {
  
  /**
   * Validar fortaleza de contraseña
   */
  static validatePassword(password) {
    const errors = [];
    
    // Longitud mínima
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    // Longitud máxima
    if (password.length > 128) {
      errors.push('La contraseña no puede tener más de 128 caracteres');
    }
    
    // Al menos una letra minúscula
    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    
    // Al menos una letra mayúscula
    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    
    // Al menos un número
    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }
    
    // Al menos un carácter especial
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }
    
    // No debe contener espacios
    if (/\s/.test(password)) {
      errors.push('La contraseña no debe contener espacios');
    }
    
    // Patrones comunes débiles
    const weakPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i
    ];
    
    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        errors.push('La contraseña contiene un patrón común inseguro');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }
  
  /**
   * Calcular fortaleza de contraseña (0-100)
   */
  static calculateStrength(password) {
    let score = 0;
    
    // Longitud
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Variedad de caracteres
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    
    // Complejidad adicional
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
    if (password.length > 20) score += 5;
    
    // Penalización por patrones repetitivos
    if (/(.)\1{2,}/.test(password)) score -= 10;
    if (/012|123|234|345|456|567|678|789|890/.test(password)) score -= 10;
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Generar hash seguro de contraseña
   */
  static async hashPassword(password) {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Error generando hash de contraseña:', error.message);
      throw new Error('Error procesando contraseña');
    }
  }
  
  /**
   * Verificar contraseña contra hash
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verificando contraseña:', error.message);
      return false;
    }
  }
  
  /**
   * Generar contraseña temporal segura
   */
  static generateTempPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Asegurar al menos un carácter de cada tipo
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz');
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    password += this.getRandomChar('0123456789');
    password += this.getRandomChar('!@#$%^&*');
    
    // Rellenar el resto aleatoriamente
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(charset);
    }
    
    // Mezclar caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  /**
   * Obtener carácter aleatorio de un conjunto
   */
  static getRandomChar(charset) {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  /**
   * Verificar si necesita rehash (para actualizaciones de seguridad)
   */
  static needsRehash(hash) {
    try {
      const currentRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashRounds = parseInt(hash.split('$')[2]);
      return hashRounds < currentRounds;
    } catch (error) {
      return true; // Si no se puede determinar, es mejor rehashear
    }
  }
  
  /**
   * Generar código de recuperación
   */
  static generateRecoveryCode(length = 6) {
    const charset = '0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return code;
  }
  
  /**
   * Validar formato de email
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      errors: isValid ? [] : ['Formato de email inválido']
    };
  }
}

module.exports = PasswordUtils;