// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginComponent from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
// Importa tus otros componentes aquí
// import Dashboard from './components/Dashboard';
// import Register from './components/Register';
// import ForgotPassword from './components/ForgotPassword';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<LoginComponent />} />
            {/* <Route path="/register" element={<Register />} /> */}
            {/* <Route path="/forgot-password" element={<ForgotPassword />} /> */}
            
            {/* Rutas protegidas */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  {/* <Dashboard /> */}
                  <div className="p-8">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p>Bienvenido al dashboard protegido</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* Ruta protegida con rol específico (ejemplo admin) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold">Panel de Administración</h1>
                    <p>Solo usuarios con rol admin pueden ver esto</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            {/* Ruta raíz - redirige al dashboard si está autenticado, sino al login */}
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />
            
            {/* Ruta 404 */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600">Página no encontrada</p>
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
