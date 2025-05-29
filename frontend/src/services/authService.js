// frontend/src/services/authService.js - VERSIÓN COMPLETA INTEGRADA

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
    // Agrega esto temporalmente en tu authService.js en el método makeRequest

    // Reemplaza temporalmente tu método makeRequest en authService.js con esto:

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
            console.log('🔍 FRONTEND - Haciendo petición a:', url);

            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
            });

            console.log('📊 FRONTEND - Status:', response.status);
            console.log('📊 FRONTEND - OK:', response.ok);

            // Leer como texto primero para debug
            const responseText = await response.text();
            console.log('📦 FRONTEND - Response Text:', responseText);

            // Intentar parsear JSON
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('📦 FRONTEND - Parsed Data:', data);
            } catch (parseError) {
                console.error('❌ FRONTEND - JSON Parse Error:', parseError);
                throw new Error('Respuesta no es JSON válido');
            }

            if (!response.ok) {
                throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('❌ FRONTEND - Error en makeRequest:', error);
            throw error;
        }
    }

    // Iniciar sesión
    // En tu authService.js - Reemplaza el método login

    // En tu authService.js - Reemplaza el método login

    async login(email, password) {
        try {
            console.log('🚀 FRONTEND - Iniciando login con:', email);

            const data = await this.makeRequest(`${this.baseURL}/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            console.log('📦 FRONTEND - Login data recibida:', data);
            console.log('🔍 FRONTEND - Verificando data.success:', data.success);
            console.log('🔍 FRONTEND - Verificando data.data:', data.data);

            if (!data.success) {
                console.error('❌ FRONTEND - Login no exitoso:', data.message);
                throw new Error(data.message || 'Login falló');
            }

            if (!data.data) {
                console.error('❌ FRONTEND - No hay data en respuesta');
                throw new Error('Respuesta de login inválida: falta data');
            }

            console.log('🔍 FRONTEND - data.data:', data.data);
            const { user, tokens } = data.data;
            console.log('🔍 FRONTEND - user extraído:', user);
            console.log('🔍 FRONTEND - tokens extraído:', tokens);

            if (!tokens || !tokens.accessToken) {
                console.error('❌ FRONTEND - No hay tokens o accessToken');
                throw new Error('Respuesta de login inválida: falta token de acceso');
            }

            if (!user || !user.id) {
                console.error('❌ FRONTEND - No hay user o user.id');
                throw new Error('Respuesta de login inválida: falta información del usuario');
            }

            console.log('✅ FRONTEND - Guardando token:', tokens.accessToken.substring(0, 20) + '...');
            this.setToken(tokens.accessToken);

            const normalizedUser = {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                telefono: user.telefono,
                role: user.rol,
                rol: user.rol,
                activo: user.activo || true,
                ultimo_acceso: user.ultimo_acceso
            };

            console.log('✅ FRONTEND - Guardando usuario:', normalizedUser);
            this.setUser(normalizedUser);

            return data;
        } catch (error) {
            console.error('❌ FRONTEND - Error completo en login:', error);
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

            if (data.success && data.data && data.data.user) {
                // Si el registro incluye auto-login
                if (data.data.tokens) {
                    const token = data.data.tokens.accessToken || data.data.tokens.token;
                    if (token) {
                        this.setToken(token);
                        this.setUser(data.data.user);
                    }
                }
            }

            return data;
        } catch (error) {
            console.error('Error en registro:', error);
            throw error;
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

            if (data.success && data.data && data.data.user) {
                const normalizedUser = {
                    id: data.data.user.id,
                    email: data.data.user.email,
                    nombre: data.data.user.nombre,
                    telefono: data.data.user.telefono,
                    role: data.data.user.rol,
                    rol: data.data.user.rol,
                    activo: data.data.user.activo
                };
                this.setUser(normalizedUser);
            }

            return data;
        } catch (error) {
            console.error('Error verificando token:', error);
            this.removeToken();
            throw error;
        }
    }

    // Obtener perfil del usuario actual
    async getCurrentUser() {
        try {
            const data = await this.makeRequest(`${this.baseURL}/me`);

            if (data.success && data.data) {
                const normalizedUser = {
                    id: data.data.id,
                    email: data.data.email,
                    nombre: data.data.nombre,
                    telefono: data.data.telefono,
                    role: data.data.rol,
                    rol: data.data.rol,
                    activo: data.data.activo,
                    ultimo_acceso: data.data.ultimo_acceso,
                    created_at: data.data.created_at
                };

                this.setUser(normalizedUser);
                return { user: normalizedUser };
            }

            return data;
        } catch (error) {
            console.error('Error obteniendo usuario actual:', error);
            throw error;
        }
    }

    // Cambiar contraseña
    async changePassword(currentPassword, newPassword) {
        try {
            const data = await this.makeRequest(`${this.baseURL}/change-password`, {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmNewPassword: newPassword
                }),
            });

            return data;
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            throw error;
        }
    }

    // Refrescar token
    async refreshToken() {
        try {
            const data = await this.makeRequest(`${this.baseURL}/refresh`, {
                method: 'POST',
            });

            if (data.success && data.data) {
                const token = data.data.accessToken || data.data.token;
                if (token) {
                    this.setToken(token);
                }
            }

            return data;
        } catch (error) {
            console.error('Error refrescando token:', error);
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
            console.error('Error solicitando restablecimiento:', error);
            throw error;
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
            console.error('Error restableciendo contraseña:', error);
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
                rol: payload.role || payload.rol,
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

    // Verificar permisos
    hasRole(requiredRole) {
        const user = this.getCurrentUserInfo();
        if (!user) return false;

        const userRole = user.role || user.rol;

        // Sistema de jerarquía de roles
        const roleHierarchy = {
            'administrador': 3,
            'supervisor': 2,
            'instalador': 1
        };

        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    }

    // Verificar si puede acceder a un recurso
    canAccess(resource) {
        const user = this.getCurrentUserInfo();
        if (!user) return false;

        const userRole = user.role || user.rol;

        // Definir permisos por rol y recurso
        const permissions = {
            'administrador': ['*'], // Acceso total
            'supervisor': ['clients', 'invoices', 'payments', 'reports', 'services'],
            'instalador': ['clients', 'installations']
        };

        const userPermissions = permissions[userRole] || [];
        return userPermissions.includes('*') || userPermissions.includes(resource);
    }
}

export default new AuthService();