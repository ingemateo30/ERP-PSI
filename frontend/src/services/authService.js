// frontend/src/services/authService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class AuthService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  // Obtener token del localStorage
  getToken() {
    return localStorage.getItem('token');
  }

  // Guardar token en localStorage
  setToken(token) {
    localStorage.setItem('token', token);
  }

  // Eliminar token del localStorage
  removeToken() {
    localStorage.removeItem('token');
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Verificar si el token no ha expirado
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  // Realizar petición HTTP con headers de autenticación
  async makeRequest(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error('Error en makeRequest:', error);
      throw error;
    }
  }

  // Iniciar sesión
  async login(email, password) {
    try {
      const data = await this.makeRequest(`${this.baseURL}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  }

  // Registrar usuario
  async register(userData) {
    try {
      const data = await this.makeRequest(`${this.baseURL}/register`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al registrar usuario');
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      await this.makeRequest(`${this.baseURL}/logout`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      this.removeToken();
    }
  }

  // Verificar token
  async verifyToken() {
    try {
      const data = await this.makeRequest(`${this.baseURL}/verify`);
      return data;
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }

  // Refrescar token
  async refreshToken() {
    try {
      const data = await this.makeRequest(`${this.baseURL}/refresh`, {
        method: 'POST',
      });

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      this.removeToken();
      throw error;
    }
  }

  // Solicitar restablecimiento de contraseña
  async forgotPassword(email) {
    try {
      const data = await this.makeRequest(`${this.baseURL}/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al solicitar restablecimiento');
    }
  }

  // Restablecer contraseña
  async resetPassword(token, password) {
    try {
      const data = await this.makeRequest(`${this.baseURL}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al restablecer contraseña');
    }
  }

  // Cambiar contraseña
  async changePassword(currentPassword, newPassword) {
    try {
      const data = await this.makeRequest(`${this.baseURL}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al cambiar contraseña');
    }
  }

  // Obtener información del usuario desde el token
  getUserFromToken() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.userId || payload.id,
        email: payload.email,
        role: payload.role,
        exp: payload.exp
      };
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService();