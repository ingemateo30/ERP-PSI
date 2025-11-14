// frontend/src/components/Layout/MainLayout.js
// VERSIÓN CON BUSCADOR AVANZADO Y FUNCIONALIDADES INNOVADORAS

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Menu, Search, Settings, User, Activity,
  Users, Calendar, ChevronUp, LogOut, ChevronDown, X,
  DollarSign, TrendingUp, UserCheck, Wifi, Loader2,
  Building2, CreditCard, MapPin, PieChart as PieChartIcon,
  Package, FileText, Wrench, BarChart3, Home, Mail,
  Clock, Zap, Hash, ArrowRight, Mic, MicOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import LogoutButton from '../LogoutButton';
import { ConfigSidebarNotification } from '../Config/ConfigNotifications';
import NotificationBell from '../Notificaciones/NotificationBell';

const MainLayout = ({ children, title, subtitle, showWelcome = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados del buscador avanzado
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const { currentUser, logout, hasPermission, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const rol = (userRole || '').toLowerCase().trim();
  const esAdministrador = rol === 'administrador';

  // ==========================================
  // DEFINICIÓN DE PÁGINAS Y COMANDOS
  // ==========================================

  const paginasDelSistema = [
    { icon: <Home size={18} />, label: 'Dashboard', path: '/dashboard', keywords: ['inicio', 'home', 'principal'], color: 'blue' },
    { icon: <Users size={18} />, label: 'Clientes', path: '/clients', keywords: ['clientes', 'usuarios', 'customers'], color: 'green' },
    { icon: <Activity size={18} />, label: 'Facturación Automática', path: '/facturacion-automatica', keywords: ['facturas', 'billing', 'automatico'], color: 'purple' },
    { icon: <TrendingUp size={18} />, label: 'Facturas', path: '/facturas', keywords: ['facturas', 'invoices', 'cobros'], color: 'yellow' },
    { icon: <FileText size={18} />, label: 'Contratos', path: '/contratos', keywords: ['contratos', 'contracts', 'acuerdos'], color: 'orange' },
    { icon: <CreditCard size={18} />, label: 'Pagos', path: '/cruce-pagos', keywords: ['pagos', 'payments', 'cruce'], color: 'green' },
    { icon: <FileText size={18} />, label: 'Historial Facturas', path: '/historial-facturas', keywords: ['historial', 'history'], color: 'gray' },
    { icon: <Wifi size={18} />, label: 'Planes de Servicio', path: '/config/service-plans', keywords: ['planes', 'servicios', 'plans'], color: 'blue' },
    { icon: <Wrench size={18} />, label: 'Instalaciones', path: '/instalaciones', keywords: ['instalaciones', 'installation', 'instalar'], color: 'red' },
    { icon: <Package size={18} />, label: 'Inventario', path: '/inventory', keywords: ['inventario', 'stock', 'productos'], color: 'indigo' },
    { icon: <Calendar size={18} />, label: 'Calendario', path: '/calendar', keywords: ['calendario', 'calendar', 'agenda'], color: 'pink' },
    { icon: <FileText size={18} />, label: 'PQR', path: '/pqr', keywords: ['pqr', 'quejas', 'reclamos', 'peticiones'], color: 'red' },
    { icon: <Loader2 size={18} />, label: 'Incidencias', path: '/incidencias', keywords: ['incidencias', 'issues', 'problemas'], color: 'orange' },
    { icon: <Mail size={18} />, label: 'Plantillas Correo', path: '/config/plantillas-correo', keywords: ['correo', 'email', 'plantillas'], color: 'blue' },
    { icon: <PieChartIcon size={18} />, label: 'Reportes', path: '/reportes-regulatorios', keywords: ['reportes', 'reports', 'regulatorios'], color: 'purple' },
    { icon: <BarChart3 size={18} />, label: 'Estadísticas', path: '/reports', keywords: ['estadisticas', 'stats', 'analytics'], color: 'green' },
    { icon: <UserCheck size={18} />, label: 'Usuarios Sistema', path: '/admin/users', keywords: ['usuarios', 'admin', 'sistema'], color: 'blue' },
    { icon: <FileText size={18} />, label: 'Firma de Contratos', path: '/firma-contratos', keywords: ['firma', 'signature', 'contratos'], color: 'indigo' },
    { icon: <Settings size={18} />, label: 'Configuración', path: '/config', keywords: ['configuracion', 'settings', 'config'], color: 'gray' },
    { icon: <User size={18} />, label: 'Mi Perfil', path: '/profile', keywords: ['perfil', 'profile', 'cuenta'], color: 'blue' },
  ];

  const comandosRapidos = [
    { icon: <Zap size={18} />, label: 'Nuevo Cliente', action: () => navigate('/clients?action=new'), keywords: ['nuevo', 'cliente', 'crear'], color: 'green' },
    { icon: <FileText size={18} />, label: 'Nueva Factura', action: () => navigate('/facturas?action=new'), keywords: ['nueva', 'factura', 'crear'], color: 'blue' },
    { icon: <Wrench size={18} />, label: 'Nueva Instalación', action: () => navigate('/instalaciones?action=new'), keywords: ['nueva', 'instalacion', 'crear'], color: 'red' },
    { icon: <Calendar size={18} />, label: 'Ver Calendario Hoy', action: () => navigate('/calendar'), keywords: ['calendario', 'hoy', 'agenda'], color: 'pink' },
    { icon: <LogOut size={18} />, label: 'Cerrar Sesión', action: logout, keywords: ['salir', 'logout', 'cerrar'], color: 'red' },
  ];

  // ==========================================
  // BÚSQUEDA DE CLIENTES (SIMULADA)
  // ==========================================

  const buscarClientes = async (query) => {
    try {
      const response = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        return data.map(cliente => ({
          icon: <Users size={18} />,
          label: cliente.nombre,
          sublabel: `ID: ${cliente.identificacion} - ${cliente.email}`,
          path: `/clients/${cliente.id}`,
          type: 'cliente',
          color: 'green'
        }));
      }
    } catch (error) {
      console.log('Error buscando clientes:', error);
    }
    return [];
  };

  // ==========================================
  // LÓGICA DE BÚSQUEDA
  // ==========================================

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      const query = searchQuery.toLowerCase();
      let results = [];

      try {
        // 1. Buscar en páginas del sistema
        const paginasEncontradas = paginasDelSistema.filter(pagina => {
          const matchLabel = pagina.label.toLowerCase().includes(query);
          const matchKeywords = pagina.keywords.some(kw => kw.includes(query));
          return matchLabel || matchKeywords;
        }).map(p => ({ ...p, type: 'pagina' }));

        results = [...paginasEncontradas];

        // 2. Buscar en comandos rápidos
        if (query.startsWith('/') || query.startsWith('>')) {
          const comandosEncontrados = comandosRapidos.filter(cmd =>
            cmd.label.toLowerCase().includes(query.slice(1)) ||
            cmd.keywords.some(kw => kw.includes(query.slice(1)))
          ).map(c => ({ ...c, type: 'comando' }));
          results = [...comandosEncontrados, ...results];
        }

        // 3. Buscar clientes si hay más de 2 caracteres
        if (query.length > 2 && !query.startsWith('/') && !query.startsWith('>')) {
          const clientes = await buscarClientes(query);
          results = [...results, ...clientes];
        }

        setSearchResults(results.slice(0, 8)); // Limitar a 8 resultados
      } catch (error) {
        console.error('Error en búsqueda:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
        setSelectedIndex(0);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // ==========================================
  // HISTORIAL DE BÚSQUEDA
  // ==========================================

  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  const agregarAlHistorial = (item) => {
    try {
      // Crear copia del item sin el ícono de React (no se puede serializar)
      const itemParaGuardar = {
        label: item.label,
        path: item.path,
        color: item.color,
        type: item.type,
        sublabel: item.sublabel
      };
      
      // Filtrar y agregar al historial
      const historialActual = searchHistory.filter(h => h.path !== item.path);
      const newHistory = [itemParaGuardar, ...historialActual].slice(0, 5);
      
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error al guardar en historial:', error);
    }
  };

  // ==========================================
  // RECONOCIMIENTO DE VOZ
  // ==========================================

  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('Reconocimiento de voz iniciado');
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Texto reconocido:', transcript);
        setSearchQuery(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsListening(false);
        
        // Mostrar mensaje de error al usuario
        if (event.error === 'not-allowed') {
          alert('Por favor permite el acceso al micrófono para usar la búsqueda por voz');
        } else if (event.error === 'no-speech') {
          alert('No se detectó ninguna voz. Intenta de nuevo.');
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Reconocimiento de voz finalizado');
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz. Intenta usar Chrome, Edge o Safari.');
      return;
    }

    if (isListening) {
      console.log('Deteniendo reconocimiento de voz');
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      console.log('Iniciando reconocimiento de voz');
      try {
        // Asegurar que el buscador esté abierto
        if (!searchOpen) {
          setSearchOpen(true);
        }
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error al iniciar reconocimiento:', error);
        setIsListening(false);
        alert('Error al iniciar el reconocimiento de voz. Intenta de nuevo.');
      }
    }
  };

  // ==========================================
  // NAVEGACIÓN CON TECLADO
  // ==========================================

  const handleKeyDown = (e) => {
    if (!searchOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelectResult(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const handleSelectResult = (result) => {
    console.log('Seleccionando resultado:', result); // Para debug
    
    // Cerrar modal primero
    setSearchOpen(false);
    setSearchQuery('');
    
    // Ejecutar acción después de un breve delay
    requestAnimationFrame(() => {
      if (result.type === 'comando' && result.action) {
        // Ejecutar comando
        result.action();
      } else if (result.path) {
        // Agregar al historial antes de navegar
        try {
          const historyItem = {
            icon: result.icon,
            label: result.label,
            path: result.path,
            color: result.color,
            type: result.type
          };
          agregarAlHistorial(historyItem);
        } catch (e) {
          console.error('Error al guardar historial:', e);
        }
        
        // Navegar a la página
        navigate(result.path, { replace: false });
        
        // Cerrar sidebar en móvil
        if (isMobile) {
          setTimeout(() => setSidebarOpen(false), 100);
        }
      }
    });
  };

  // ==========================================
  // ATAJOS DE TECLADO GLOBALES
  // ==========================================

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl/Cmd + K para abrir búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ==========================================
  // CERRAR AL HACER CLICK FUERA
  // ==========================================

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target) && !isMobile) {
        setSearchOpen(false);
      }
      if (profileOpen && !e.target.closest('.profile-menu')) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen, isMobile]);

  // ==========================================
  // ESTILOS Y RESPONSIVE
  // ==========================================

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .search-highlight {
        animation: pulse 0.3s ease-in-out;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleContentClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // ==========================================
  // MENÚ ORGANIZADO POR GRUPOS
  // ==========================================

  const gestionPrincipal = [
    { icon: <Home size={22} />, label: 'Dashboard', path: '/dashboard', permission: null },
    { icon: <Users size={22} />, label: 'Clientes', path: '/clients', permission: 'supervisor,administrador' }
  ];

  const facturacionFinanzas = [
    { icon: <Activity size={22} />, label: 'Facturación Automática', path: '/facturacion-automatica', permission: 'administrador' },
    { icon: <TrendingUp size={22} />, label: 'Facturas', path: '/facturas', permission: 'supervisor,administrador' },
    { icon: <FileText size={22} />, label: 'Contratos', path: '/contratos', permission: 'supervisor,administrador' },
    { icon: <CreditCard size={22} />, label: 'Pagos', path: '/cruce-pagos', permission: 'supervisor,administrador' },
    { icon: <FileText size={22} />, label: 'Historial Facturas', path: '/historial-facturas', permission: 'supervisor,administrador' }
  ];

  const serviciosOperaciones = [
    { icon: <Wifi size={22} />, label: 'Planes de Servicio', path: '/config/service-plans', permission: 'administrador' },
    { icon: <Wrench size={22} />, label: 'Instalaciones', path: '/instalaciones', permission: 'instalador,supervisor,administrador' },
    { icon: <Package size={22} />, label: 'Inventario', path: '/inventory', permission: 'instalador,supervisor,administrador' },
    { icon: <Calendar size={22} />, label: 'Calendario', path: '/calendar', permission: 'instalador,supervisor,administrador' }
  ];

  const atencionCliente = [
    { icon: <FileText size={22} />, label: 'PQR', path: '/pqr', permission: 'supervisor,administrador' },
    { icon: <Loader2 size={22} />, label: 'Incidencias', path: '/incidencias', permission: 'supervisor,administrador' },
    { icon: <Mail size={22} />, label: 'Plantillas Correo', path: '/config/plantillas-correo', permission: 'supervisor,administrador' }
  ];

  const reportesAnalisis = [
    { icon: <PieChartIcon size={22} />, label: 'Reportes', path: '/reportes-regulatorios', permission: 'administrador' },
    { icon: <BarChart3 size={22} />, label: 'Estadísticas', path: '/reports', permission: 'administrador' },
    { icon: <BarChart3 size={22} />, label: 'Mapa', path: '/mapa-instalaciones', permission: 'instalador,administrador,supervisor' }
    
  ];

  const administracion = [
    { icon: <UserCheck size={22} />, label: 'Usuarios Sistema', path: '/admin/users', permission: 'administrador' },
    { icon: <FileText size={22} />, label: 'Firma de Contratos', path: '/firma-contratos', permission: 'administrador' },
    { icon: <Settings size={22} />, label: 'Configuración', path: '/config', permission: 'administrador' }
  ];

  const filtrarPorPermisos = (items) => {
    return items.filter(item => !item.permission || hasPermission(item.permission));
  };

  const grupos = [
    { titulo: 'Principal', items: filtrarPorPermisos(gestionPrincipal) },
    { titulo: 'Facturación', items: filtrarPorPermisos(facturacionFinanzas) },
    { titulo: 'Servicios', items: filtrarPorPermisos(serviciosOperaciones) },
    { titulo: 'Atención', items: filtrarPorPermisos(atencionCliente) },
    { titulo: 'Reportes', items: filtrarPorPermisos(reportesAnalisis) },
    { titulo: 'Admin', items: filtrarPorPermisos(administracion) }
  ].filter(grupo => grupo.items.length > 0);

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const isActivePath = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      pink: 'bg-pink-100 text-pink-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative z-30 backdrop-blur-xl bg-gradient-to-b from-[#0e6493]/95 to-[#0e6493]/85 border border-white/10 shadow-lg transition-all duration-300 ease-in-out h-screen flex flex-col ${sidebarOpen ? 'translate-x-0 w-64' : 'translate-x-0 md:translate-x-0 w-0 md:w-20'} overflow-hidden`}>
        {isMobile && sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-4 top-4 p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
          >
            <X size={18} />
          </button>
        )}

        <nav className="mt-16 flex-1 px-2 overflow-y-auto scrollbar-hide">
          {grupos.map((grupo, grupoIndex) => (
            <div key={grupoIndex} className="mb-4">
              {sidebarOpen && grupo.items.length > 0 && (
                <div className="px-3 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider border-b border-white/10 mb-2">
                  {grupo.titulo}
                </div>
              )}

              {grupo.items.map((item, index) => (
                <div
                  key={`${grupoIndex}-${index}`}
                  className={`flex items-center px-4 py-3 my-1 rounded-xl transition duration-300 cursor-pointer ${isActivePath(item.path)
                    ? 'bg-white/20 text-white'
                    : 'hover:bg-[#0e6493]/50 hover:text-white text-white/80'
                    }`}
                  onClick={() => handleMenuClick(item.path)}
                >
                  <div className="flex items-center justify-center">
                    {item.icon}
                  </div>
                  {sidebarOpen && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {sidebarOpen && esAdministrador && (
          <div className="px-2 pb-2">
            <ConfigSidebarNotification />
          </div>
        )}

        <div className="p-4 border-t border-white/10 mt-auto flex-shrink-0">
          {sidebarOpen ? (
            <LogoutButton variant="ghost" className="text-white hover:bg-white/20 w-full justify-start" />
          ) : (
            <div className="flex justify-center">
              <button
                onClick={logout}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative" onClick={handleContentClick}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition duration-300"
              >
                <Menu size={22} className="text-gray-600" />
              </button>

              <div className="flex items-center">
                <img
                  src="/logo2.png"
                  alt="Logo"
                  className="h-14 w-auto object-contain scale-x-105"
                />
                <span className="ml-2 text-xl font-semibold text-[#0e6493] hidden sm:block">
                  Administrativo
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* BUSCADOR AVANZADO */}
              <div className="relative" ref={searchRef}>
                <div className="hidden md:block relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Escuchando..." : "Buscar... (Ctrl+K)"}
                    className={`pl-10 pr-20 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      isListening 
                        ? 'ring-2 ring-red-500 border-red-500 bg-red-50' 
                        : 'focus:ring-[#0e6493]/70'
                    } w-40 lg:w-80`}
                    style={{ borderColor: isListening ? '#ef4444' : '#0e6493' }}
                    readOnly={isListening}
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <Search size={18} />
                  </div>
                  
                  {/* Botón de voz */}
                  {voiceSupported && (
                    <button
                      onClick={toggleVoiceSearch}
                      className={`absolute right-12 top-2 p-1 rounded transition-colors ${
                        isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={isListening ? "Escuchando... (click para detener)" : "Búsqueda por voz"}
                    >
                      {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                  )}
                  
                  {/* Indicador de carga */}
                  {searchLoading && (
                    <div className="absolute right-3 top-2.5 text-[#0e6493]">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  )}
                  
                  {/* Contador de resultados */}
                  {!searchLoading && searchQuery && (
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400">
                      {searchResults.length}
                    </div>
                  )}
                </div>

                {/* Panel de resultados */}
                {searchOpen && (
                  <div className="absolute top-full mt-2 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                    {/* Ayuda rápida */}
                    {!searchQuery && (
                      <div className="p-4 border-b border-gray-100">
                        <div className="text-xs text-gray-500 space-y-2">
                          <div className="flex items-center gap-2">
                            <Hash size={14} />
                            <span>Escribe para buscar páginas, clientes...</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap size={14} />
                            <span>Usa <code className="px-1 bg-gray-100 rounded">/</code> o <code className="px-1 bg-gray-100 rounded">&gt;</code> para comandos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑↓</kbd>
                            <span>Navegar</span>
                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd>
                            <span>Seleccionar</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Historial de búsqueda */}
                    {!searchQuery && searchHistory.length > 0 && (
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 flex items-center gap-2">
                          <Clock size={14} />
                          Búsquedas recientes
                        </div>
                        {searchHistory.map((item, index) => {
                          // Buscar el ícono correspondiente de las páginas del sistema
                          const paginaOriginal = paginasDelSistema.find(p => p.path === item.path);
                          const icon = paginaOriginal?.icon || <FileText size={18} />;
                          
                          return (
                            <div
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectResult({ ...item, icon });
                              }}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <div className={`p-2 rounded-lg ${getColorClasses(item.color)}`}>
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {item.label}
                                </div>
                              </div>
                              <ArrowRight size={16} className="text-gray-400" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Resultados de búsqueda */}
                    {searchQuery && searchResults.length > 0 && (
                      <div className="p-2">
                        {searchResults.map((result, index) => (
                          <div
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectResult(result);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              selectedIndex === index
                                ? 'bg-[#0e6493]/10 border border-[#0e6493]/20'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${getColorClasses(result.color)}`}>
                              {result.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {result.label}
                              </div>
                              {result.sublabel && (
                                <div className="text-xs text-gray-500 truncate">
                                  {result.sublabel}
                                </div>
                              )}
                            </div>
                            {result.type === 'comando' && (
                              <Zap size={16} className="text-yellow-500" />
                            )}
                            {result.type === 'cliente' && (
                              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                                Cliente
                              </span>
                            )}
                            {result.type === 'pagina' && (
                              <ArrowRight size={16} className="text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sin resultados */}
                    {searchQuery && searchResults.length === 0 && !searchLoading && (
                      <div className="p-8 text-center">
                        <Search size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">
                          No se encontraron resultados para "{searchQuery}"
                        </p>
                        <p className="text-gray-400 text-xs mt-2">
                          Intenta con otros términos de búsqueda
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="md:hidden p-2 rounded-full hover:bg-gray-100"
              >
                <Search size={20} />
              </button>

              {/* Campanita de notificaciones */}
              <NotificationBell />

              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>

              {/* Menú de perfil */}
              <div className="relative profile-menu">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0e6493]/10 flex items-center justify-center overflow-hidden border border-[#0e6493]/30">
                    <User size={18} className="text-[#0e6493]" />
                  </div>
                  <span className="ml-2 font-medium hidden sm:block">
                    {currentUser?.nombre || 'Usuario'}
                  </span>
                  <ChevronDown size={16} className="ml-1 hidden sm:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{currentUser?.nombre}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{currentUser?.rol}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                    >
                      <User size={16} className="mr-2" />
                      Mi Perfil
                    </button>

                    {esAdministrador && (
                      <button
                        onClick={() => {
                          navigate('/config');
                          setProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                      >
                        <Settings size={16} className="mr-2" />
                        Configuración
                      </button>
                    )}
                    <div className="border-t border-gray-100 mt-1">
                      <LogoutButton 
                        variant="ghost" 
                        className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" 
                        showIcon={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {showWelcome && (
            <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0a5273] text-white p-6 rounded-lg shadow-lg">
              <h1 className="text-2xl font-bold mb-2">
                ¡Bienvenido, {currentUser?.nombre}!
              </h1>
              <p className="text-blue-100">
                Sistema de gestión para empresa de internet y televisión
              </p>
              <p className="text-blue-200 text-sm mt-1">
                Rol: <span className="font-semibold capitalize">{userRole}</span>
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-100">
                <Search size={16} />
                <span>Presiona <kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">Ctrl+K</kbd> para búsqueda rápida</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Modal de búsqueda para móvil */}
      {isMobile && searchOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar..."
                  className="w-full pl-10 pr-20 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]/70"
                  autoFocus
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  <Search size={20} />
                </div>
                
                {/* Botón de voz móvil */}
                {voiceSupported && (
                  <button
                    onClick={toggleVoiceSearch}
                    className={`absolute right-12 top-2.5 p-1 rounded transition-colors ${
                      isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {isListening ? <Mic size={20} /> : <MicOff size={20} />}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {/* Resultados móvil */}
              {searchQuery && searchResults.length > 0 && (
                <div className="p-2">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectResult(result);
                      }}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getColorClasses(result.color)}`}>
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {result.label}
                        </div>
                        {result.sublabel && (
                          <div className="text-xs text-gray-500 truncate">
                            {result.sublabel}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Historial móvil */}
              {!searchQuery && searchHistory.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                    Recientes
                  </div>
                  {searchHistory.map((item, index) => {
                    const paginaOriginal = paginasDelSistema.find(p => p.path === item.path);
                    const icon = paginaOriginal?.icon || <FileText size={18} />;
                    
                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectResult({ ...item, icon });
                        }}
                        className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <div className={`p-2 rounded-lg ${getColorClasses(item.color)}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!searchQuery && searchHistory.length === 0 && (
                <div className="p-8 text-center">
                  <Search size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">
                    Comienza a buscar páginas o clientes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;