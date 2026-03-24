// Componente de rastreo GPS continuo para instaladores
// Se incluye una vez en App.js y funciona durante toda la sesión
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const INTERVALO_MS = 30000; // cada 30 segundos
const API_URL = process.env.REACT_APP_API_URL;

const GpsTrackerGlobal = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const intervalRef = useRef(null);
  const watchRef   = useRef(null);

  const esInstalador = isAuthenticated &&
    (currentUser?.rol === 'instalador' || currentUser?.role === 'instalador');

  const enviarPosicion = (pos) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    fetch(`${API_URL}/instalador/ubicacion`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, precision: Math.round(accuracy), instalacion_id: null })
    }).catch(() => {});
  };

  const solicitarPosicion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(enviarPosicion, () => {}, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 20000
    });
  };

  useEffect(() => {
    if (!esInstalador) return;

    // Enviar posición inmediatamente al entrar
    solicitarPosicion();

    // Repetir cada 30 segundos
    intervalRef.current = setInterval(solicitarPosicion, INTERVALO_MS);

    return () => {
      clearInterval(intervalRef.current);
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esInstalador]);

  return null; // no renderiza nada
};

export default GpsTrackerGlobal;
