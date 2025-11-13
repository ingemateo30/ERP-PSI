import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  HelpCircle,
  Zap,
  Shield,
  Clock,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
} from 'lucide-react';
import ChatBot from './ChatBot';
import * as soporteService from '../../services/soporteService';

const SoportePage = () => {
  const [faqs, setFaqs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Cargar FAQs
  useEffect(() => {
    loadFAQs();
  }, [selectedCategory]);

  const loadFAQs = async () => {
    try {
      const response = await soporteService.getFAQs({
        categoria: selectedCategory,
        limit: 20,
      });
      setFaqs(response.data);
    } catch (error) {
      console.error('Error cargando FAQs:', error);
    }
  };

  const handleFaqClick = (faqId) => {
    if (expandedFaq === faqId) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(faqId);
      // Registrar vista
      soporteService.incrementFAQView(faqId);
    }
  };

  const handleFaqUseful = async (faqId) => {
    try {
      await soporteService.markFAQAsUseful(faqId);
      alert('¡Gracias por tu feedback!');
      loadFAQs(); // Recargar para actualizar contador
    } catch (error) {
      console.error('Error marcando FAQ:', error);
    }
  };

  const categories = [
    { value: 'todas', label: 'Todas', icon: HelpCircle },
    { value: 'tecnica', label: 'Técnica', icon: Zap },
    { value: 'facturacion', label: 'Facturación', icon: Shield },
    { value: 'comercial', label: 'Comercial', icon: Phone },
    { value: 'general', label: 'General', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Centro de Soporte
              </h1>
              <p className="mt-1 text-gray-600">
                ¿Necesitas ayuda? Estamos aquí para ti
              </p>
            </div>
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Hablar con Asistente
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Asistente IA de Soporte
              </h2>
              <p className="text-lg text-blue-100 mb-6">
                Obtén respuestas instantáneas a tus preguntas. Nuestro
                asistente con inteligencia artificial puede ayudarte a resolver
                problemas comunes en segundos.
              </p>
              <button
                onClick={() => setIsChatOpen(true)}
                className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Iniciar Chat Ahora
              </button>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl"></div>
                <MessageCircle className="w-48 h-48 text-white/80 relative" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          ¿Cómo podemos ayudarte?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Soporte Técnico
            </h3>
            <p className="text-gray-600 mb-4">
              Ayuda con problemas de internet, WiFi, router y más.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Reinicio de router</li>
              <li>• Problemas de conexión</li>
              <li>• Velocidad de internet</li>
              <li>• Configuración WiFi</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Facturación
            </h3>
            <p className="text-gray-600 mb-4">
              Consultas sobre pagos, facturas y servicios.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Consultar facturas</li>
              <li>• Métodos de pago</li>
              <li>• Fecha de vencimiento</li>
              <li>• Aclaración de cobros</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Servicios
            </h3>
            <p className="text-gray-600 mb-4">
              Información sobre planes y contratación.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Planes disponibles</li>
              <li>• Cambio de plan</li>
              <li>• Nueva instalación</li>
              <li>• Servicios adicionales</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Preguntas Frecuentes
        </h2>
        <p className="text-gray-600 mb-8 text-center">
          Encuentra respuestas rápidas a las preguntas más comunes
        </p>

        {/* Categorías */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Lista de FAQs */}
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => handleFaqClick(faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-left text-gray-900">
                  {faq.pregunta}
                </span>
                {expandedFaq === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>

              {expandedFaq === faq.id && (
                <div className="px-6 pb-4 border-t border-gray-200">
                  <div className="pt-4 text-gray-700 whitespace-pre-wrap">
                    {faq.respuesta}
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      ¿Te fue útil esta respuesta?
                    </span>
                    <button
                      onClick={() => handleFaqUseful(faq.id)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Sí, me ayudó
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {faqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No hay preguntas frecuentes en esta categoría.
            </p>
          </div>
        )}
      </section>

      {/* Contact Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Otros Canales de Contacto
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Teléfono</h3>
                <p className="text-gray-600 text-sm">Línea de atención</p>
                <p className="text-blue-600 font-semibold mt-1">
                  (601) 123-4567
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                <p className="text-gray-600 text-sm">Escríbenos</p>
                <p className="text-green-600 font-semibold mt-1">
                  soporte@empresa.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Oficina</h3>
                <p className="text-gray-600 text-sm">
                  Visítanos Lun - Vie
                  <br />
                  8:00 AM - 5:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chatbot flotante */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl h-[600px]">
            <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          </div>
        </div>
      )}

      {/* Botón flotante */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40"
          title="Abrir chat de soporte"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 ERP-PSI. Todos los derechos reservados.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Centro de Soporte • Powered by IA
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SoportePage;
