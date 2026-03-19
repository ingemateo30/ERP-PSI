// Formatear valores monetarios en pesos colombianos (COP) sin centavos
export const formatCOP = (value) => {
  if (value === null || value === undefined || value === '') return '$0';
  const num = Number(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Alias corto para uso frecuente
export default formatCOP;
