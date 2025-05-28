// frontend/src/services/authService.js - VERSIÓN SIMPLIFICADA

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class AuthService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  // Obtener token del localStorage
  getToken() {
    return localStorage.getItem('accessToken');
  }

  // Guardar token en localStorage
  setToken(token) {
    localStorage.setItem('accessToken', token);
  }

  // Eliminar token del localStorage
  removeToken() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }

  // Guardar información del usuario
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Obtener información del usuario
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error verificando token:', error);
      return false;
    }
  }

  // Realizar petición HTTP básica
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
      console.log('Haciendo petición a:', url);
      
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();
      console.log('Respuesta recibida:', data);

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
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
      console.log('Intentando login con:', email);
      
      const data = await this.makeRequest(`${this.baseURL}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('Datos de login recibidos:', data);

      // El backend devuelve tanto 'token' como 'accessToken'
      const token = data.token || data.accessToken;
      
      if (token) {
        this.setToken(token);
        console.log('Token guardado:', token);
      }

      if (data.data && data.data.user) {
        this.setUser(data.data.user);
        console.log('Usuario guardado:', data.data.user);
      }

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      // Intentar llamar al endpoint de logout del backend
      await this.makeRequest(`${this.baseURL}/logout`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
    } finally {
      // Siempre limpiar datos locales
      this.removeToken();
    }
  }

  // Verificar token
  async verifyToken() {
    try {
      const data = await this.makeRequest(`${this.baseURL}/verify`);
      
      if (data.data && data.data.user) {
        this.setUser(data.data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Error verificando token:', error);
      this.removeToken();
      throw error;
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
        nombre: payload.nombre,
        role: payload.role || payload.rol,
        exp: payload.exp
      };
    } catch (error) {
      console.error('Error extrayendo usuario del token:', error);
      return null;
    }
  }

  // Obtener información del usuario (prioriza localStorage, luego token)
  getCurrentUserInfo() {
    // Primero intentar desde localStorage
    const userFromStorage = this.getUser();
    if (userFromStorage) return userFromStorage;
    
    // Si no hay en localStorage, extraer del token
    return this.getUserFromToken();
  }
}

export default new AuthService();