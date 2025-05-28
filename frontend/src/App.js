// frontend/src/App.js - VERSIÓN ACTUALIZADA CON CONFIGURACIONES

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Lazy loading de componentes principales
const LoginComponent = lazy(() => import('./components/Login'));
const SimpleDashboard = lazy(() => import('./components/SimpleDashboard'));
const UserProfile = lazy(() => import('./components/UserProfile'));

// Lazy loading de componentes de configuración
const ConfigMain = lazy(() => import('./components/Config/ConfigMain'));
const CompanyConfig = lazy(() => import('./components/Config/CompanyConfig'));
const BanksConfig = lazy(() => import('./components/Config/BanksConfig'));
const GeographyConfig = lazy(() => import('./components/Config/GeographyConfig'));

// Componente de carga
const LoadingFallback = ({ message = "Cargando..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  </div>
);

// Componente temporal para páginas no implementadas
const ComingSoon = ({ pageName }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8">
      <div className="w-24 h-24 mx-auto mb-4 bg-[#0e6493]/10 rounded-full flex items-center justify-center">
        <svg
          className="w-12 h-12 text-[#0e6493]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {pageName} - Próximamente
      </h2>
      <p className="text-gray-600 mb-4">
        Esta funcionalidad está en desarrollo
      </p>
      <div className="space-x-4">
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Volver
        </button>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
        >
          Ir al Dashboard
        </button>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Suspense fallback={<LoadingFallback message="Cargando aplicación..." />}>
            <Routes>
              {/* ================================ */}
              {/* RUTAS PÚBLICAS */}
              {/* ================================ */}
              
              <Route 
                path="/login" 
                element={<LoginComponent />} 
              />
              
              <Route 
                path="/register" 
                element={<ComingSoon pageName="Registro de Usuario" />} 
              />
              
              <Route 
                path="/forgot-password" 
                element={<ComingSoon pageName="Recuperar Contraseña" />} 
              />
              
              <Route 
                path="/reset-password" 
                element={<ComingSoon pageName="Restablecer Contraseña" />} 
              />

              {/* ================================ */}
              {/* RUTAS PROTEGIDAS GENERALES */}
              {/* ================================ */}
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <SimpleDashboard />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } 
              />

              {/* ================================ */}
              {/* RUTAS DE CONFIGURACIÓN */}
              {/* ================================ */}
              
              <Route 
                path="/config" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <ConfigMain />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/config/company" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <CompanyConfig />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/config/banks" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <BanksConfig />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/config/geography" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <GeographyConfig />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/config/service-plans" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <ComingSoon pageName="Gestión de Planes de Servicio" />
                  </ProtectedRoute>
                } 
              />

              {/* ================================ */}
              {/* RUTAS DE GESTIÓN PRINCIPAL */}
              {/* ================================ */}
              
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute requiredRole="supervisor">
                    <ComingSoon pageName="Gestión de Clientes" />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients/:id" 
                element={
                  <ProtectedRoute requiredRole="supervisor">
                    <ComingSoon pageName="Detalle de Cliente" />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/invoices" 
                element={
                  <ProtectedRoute requiredRole="supervisor">
                    <ComingSoon pageName="Gestión de Facturas" />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/invoices/:id" 
                element={
                  <ProtectedRoute requiredRole="supervisor">
                    <ComingSoon pageName="Detalle de Factura" />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/services" 
                element={
                  <ProtectedRoute requiredRole="supervisor">
                    <ComingSoon pageName="Gestión de Servicios" />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/installations" 
                element={
                  <ProtectedRoute requiredRole="instalador">
                    <ComingSoon pageName="Gestión de Instalaciones" />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute requiredRole="supervisor">
                    <ComingSoon pageName="Reportes y Estadísticas" />
                  </ProtectedRoute>
                } 
              />

              {/* ================================ */}
              {/* RUTAS DE ADMINISTRACIÓN */}
              {/* ================================ */}
              
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <div className="min-h-screen bg-gray-50 p-8">
                      <div className="max-w-6xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-900 mb-6">
                          Panel de Administración
                        </h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Configuración del Sistema */}
                          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                              <div className="w-12 h-12 bg-[#0e6493]/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#0e6493]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Configuración del Sistema
                            </h3>
                            <p className="text-gray-600 mb-4">
                              Configurar empresa, bancos, sectores y parámetros generales
                            </p>
                            <button 
                              onClick={() => window.location.href = '/config'}
                              className="w-full px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                            >
                              Acceder
                            </button>
                          </div>
                          
                          {/* Gestión de Usuarios */}
                          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                              <div className="w-12 h-12 bg-[#e21f25]/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-[#e21f25]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Gestión de Usuarios
                            </h3>
                            <p className="text-gray-600 mb-4">
                              Administrar usuarios del sistema y sus permisos
                            </p>
                            <button 
                              onClick={() => alert('Funcionalidad en desarrollo')}
                              className="w-full px-4 py-2 bg-[#e21f25] text-white rounded-lg hover:bg-[#e21f25]/90 transition-colors"
                            >
                              Acceder
                            </button>
                          </div>
                          
                          {/* Logs del Sistema */}
                          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Logs del Sistema
                            </h3>
                            <p className="text-gray-600 mb-4">
                              Revisar actividad y eventos del sistema
                            </p>
                            <button 
                              onClick={() => alert('Funcionalidad en desarrollo')}
                              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Acceder
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute requiredRole="administrador">
                    <ComingSoon pageName="Gestión de Usuarios del Sistema" />
                  </ProtectedRoute>
                } 
              />

              {/* ================================ */}
              {/* RUTAS ESPECIALES */}
              {/* ================================ */}
              
              <Route 
                path="/" 
                element={<Navigate to="/dashboard" replace />} 
              />
              
              <Route 
                path="*" 
                element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8">
                      <div className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-6">
                        Lo sentimos, la página que buscas no existe.
                      </p>
                      <div className="space-x-4">
                        <button 
                          onClick={() => window.history.back()}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Volver
                        </button>
                        <button 
                          onClick={() => window.location.href = '/dashboard'}
                          className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                        >
                          Ir al Dashboard
                        </button>
                      </div>
                    </div>
                  </div>
                } 
              />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;