/**
 * Servicio para el sistema de Soporte con Chatbot IA
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1';
const SOPORTE_URL = `${API_URL}/soporte`;

/**
 * Enviar mensaje al chatbot
 */
export const sendMessage = async (messageData) => {
  try {
    const response = await axios.post(`${SOPORTE_URL}/chat`, messageData);
    return response.data;
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    throw error.response?.data || { error: 'Error de conexión' };
  }
};

/**
 * Crear ticket desde conversación
 */
export const createTicketFromChat = async (ticketData) => {
  try {
    const response = await axios.post(`${SOPORTE_URL}/ticket`, ticketData);
    return response.data;
  } catch (error) {
    console.error('Error creando ticket:', error);
    throw error.response?.data || { error: 'Error al crear ticket' };
  }
};

/**
 * Marcar problema como resuelto
 */
export const markAsResolved = async (resolvedData) => {
  try {
    const response = await axios.post(`${SOPORTE_URL}/resolved`, resolvedData);
    return response.data;
  } catch (error) {
    console.error('Error marcando como resuelto:', error);
    throw error.response?.data || { error: 'Error al marcar como resuelto' };
  }
};

/**
 * Obtener FAQs
 */
export const getFAQs = async (params = {}) => {
  try {
    const response = await axios.get(`${SOPORTE_URL}/faqs`, { params });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo FAQs:', error);
    throw error.response?.data || { error: 'Error al obtener FAQs' };
  }
};

/**
 * Incrementar vista de FAQ
 */
export const incrementFAQView = async (faqId) => {
  try {
    const response = await axios.post(`${SOPORTE_URL}/faqs/${faqId}/view`);
    return response.data;
  } catch (error) {
    console.error('Error incrementando vista:', error);
    // No lanzar error, es solo estadística
    return null;
  }
};

/**
 * Marcar FAQ como útil
 */
export const markFAQAsUseful = async (faqId) => {
  try {
    const response = await axios.post(`${SOPORTE_URL}/faqs/${faqId}/useful`);
    return response.data;
  } catch (error) {
    console.error('Error marcando FAQ útil:', error);
    throw error.response?.data || { error: 'Error al marcar FAQ' };
  }
};

/**
 * Finalizar sesión
 */
export const endSession = async (sessionData) => {
  try {
    const response = await axios.post(`${SOPORTE_URL}/session/end`, sessionData);
    return response.data;
  } catch (error) {
    console.error('Error finalizando sesión:', error);
    throw error.response?.data || { error: 'Error al finalizar sesión' };
  }
};

/**
 * Obtener estadísticas
 */
export const getStatistics = async (params = {}) => {
  try {
    const response = await axios.get(`${SOPORTE_URL}/statistics`, { params });
    return response.data;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error.response?.data || { error: 'Error al obtener estadísticas' };
  }
};

export default {
  sendMessage,
  createTicketFromChat,
  markAsResolved,
  getFAQs,
  incrementFAQView,
  markFAQAsUseful,
  endSession,
  getStatistics,
};
