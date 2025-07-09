// ========================================
// frontend/src/services/ivaService.js - ARCHIVO NUEVO
// Servicio para cálculos de IVA en el frontend
// ========================================

/**
 * Servicio para cálculos de IVA en el frontend
 */
class IVAService {
  
  /**
   * Determinar si aplica IVA según tipo de servicio y estrato
   */
  static determinarIVA(tipoServicio, estrato) {
    const estratoNumerico = parseInt(estrato) || 3;

    switch (tipoServicio.toLowerCase()) {
      case 'internet':
        return {
          aplica: estratoNumerico > 3,
          porcentaje: estratoNumerico > 3 ? 19 : 0,
          descripcion: estratoNumerico <= 3 ? 
            `Internet - Sin IVA (Estrato ${estratoNumerico})` : 
            `Internet - IVA 19% (Estrato ${estratoNumerico})`
        };
      
      case 'television':
      case 'tv':
        return {
          aplica: true,
          porcentaje: 19,
          descripcion: 'Televisión - IVA 19% (Todos los estratos)'
        };
      
      case 'reconexion':
      case 'varios':
        return {
          aplica: true,
          porcentaje: 19,
          descripcion: 'Reconexión/Varios - IVA 19%'
        };
      
      case 'publicidad':
        return {
          aplica: false,
          porcentaje: 0,
          descripcion: 'Publicidad - Sin IVA'
        };
      
      case 'interes':
      case 'intereses':
        return {
          aplica: false,
          porcentaje: 0,
          descripcion: 'Intereses - Sin IVA'
        };
      
      default:
        return {
          aplica: false,
          porcentaje: 0,
          descripcion: 'Servicio - Sin IVA'
        };
    }
  }

  /**
   * Calcular precio con IVA
   */
  static calcularPrecioConIVA(precioBase, tipoServicio, estrato) {
    const configuracionIVA = this.determinarIVA(tipoServicio, estrato);
    const precioSinIVA = parseFloat(precioBase) || 0;
    
    let valorIVA = 0;
    let precioConIVA = precioSinIVA;

    if (configuracionIVA.aplica) {
      valorIVA = Math.round(precioSinIVA * (configuracionIVA.porcentaje / 100));
      precioConIVA = precioSinIVA + valorIVA;
    }

    return {
      precio_sin_iva: Math.round(precioSinIVA),
      precio_con_iva: Math.round(precioConIVA),
      valor_iva: Math.round(valorIVA),
      aplica_iva: configuracionIVA.aplica,
      porcentaje_iva: configuracionIVA.porcentaje,
      descripcion: configuracionIVA.descripcion
    };
  }

  /**
   * Formatear valor en pesos colombianos
   */
  static formatearPesos(valor) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  }

  /**
   * Obtener badge de estrato con información de IVA
   */
  static getBadgeEstrato(estrato) {
    const estratoNum = parseInt(estrato) || 3;
    const aplicaIVAInternet = estratoNum > 3;
    
    return {
      estrato: estratoNum,
      aplicaIVAInternet,
      clase: aplicaIVAInternet ? 'estrato-alto' : 'estrato-bajo',
      texto: `E${estratoNum}`,
      descripcion: aplicaIVAInternet ? 'Internet con IVA 19%' : 'Internet sin IVA'
    };
  }

  /**
   * Calcular resumen de IVA para múltiples facturas
   */
  static calcularResumenIVA(facturas) {
    return facturas.reduce((acc, factura) => {
      const estrato = parseInt(factura.estrato) || 3;
      
      // Internet
      if (estrato <= 3) {
        acc.internetSinIVA += (factura.internet || 0);
        acc.clientesEstratosBajos++;
      } else {
        acc.internetConIVA += (factura.internet || 0);
        acc.ivaInternetRecaudado += (factura.s_internet || 0);
        acc.clientesEstratosAltos++;
      }
      
      // Otros servicios
      acc.ivaTotalRecaudado += (factura.iva || 0);
      acc.ivaTelevision += (factura.s_television || 0);
      acc.ivaVarios += (factura.s_varios || 0);
      acc.ivaReconexion += (factura.s_reconexion || 0);
      
      return acc;
    }, {
      internetSinIVA: 0,
      internetConIVA: 0,
      ivaInternetRecaudado: 0,
      ivaTotalRecaudado: 0,
      ivaTelevision: 0,
      ivaVarios: 0,
      ivaReconexion: 0,
      clientesEstratosBajos: 0,
      clientesEstratosAltos: 0
    });
  }

  /**
   * Validar estrato
   */
  static validarEstrato(estrato) {
    const estratoNum = parseInt(estrato);
    return estratoNum >= 1 && estratoNum <= 6 ? estratoNum : 3;
  }

  /**
   * Obtener información completa de IVA para un servicio
   */
  static getInfoCompleta(tipoServicio, estrato, precio) {
    const configuracionIVA = this.determinarIVA(tipoServicio, estrato);
    const precios = this.calcularPrecioConIVA(precio, tipoServicio, estrato);
    
    return {
      ...configuracionIVA,
      ...precios,
      precio_mostrar: precios.precio_con_iva,
      ahorro_iva: configuracionIVA.aplica ? 0 : Math.round(precio * 0.19)
    };
  }

  /**
   * Generar componentes React para mostrar información de IVA
   */
  static generarComponentesReact() {
    return {
      // Badge de estrato con información de IVA
      getBadgeEstratoComponent: (estrato) => {
        const estratoNum = parseInt(estrato) || 3;
        const aplicaIVAInternet = estratoNum > 3;
        
        return {
          jsx: `
            <div className="text-center">
              <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                E${estratoNum}
              </span>
              <div className="text-xs mt-1">
                <span className="inline-block px-1 py-0.5 rounded ${
                  aplicaIVAInternet 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'
                }">
                  ${aplicaIVAInternet ? 'IVA 19%' : 'Sin IVA'}
                </span>
              </div>
            </div>
          `,
          data: {
            estrato: estratoNum,
            aplicaIVA: aplicaIVAInternet,
            texto: aplicaIVAInternet ? 'IVA 19%' : 'Sin IVA'
          }
        };
      },

      // Alerta con reglas de IVA
      getAlertaReglasIVA: () => ({
        jsx: `
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <div className="w-5 h-5 text-blue-600 mr-2">ℹ️</div>
              <h3 className="text-sm font-medium text-blue-800">
                Reglas de IVA Aplicadas en el Sistema
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h4 className="font-medium mb-1">Internet por Estrato:</h4>
                <ul className="space-y-1">
                  <li>• Estratos 1, 2, 3: <span className="text-green-600 font-medium">Sin IVA (0%)</span></li>
                  <li>• Estratos 4, 5, 6: <span className="text-red-600 font-medium">IVA 19%</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-1">Otros Servicios:</h4>
                <ul className="space-y-1">
                  <li>• Televisión: <span className="text-red-600 font-medium">IVA 19%</span> (todos)</li>
                  <li>• Reconexión/Varios: <span className="text-red-600 font-medium">IVA 19%</span></li>
                  <li>• Publicidad/Intereses: <span className="text-green-600 font-medium">Sin IVA</span></li>
                </ul>
              </div>
            </div>
          </div>
        `
      })
    };
  }
}

export default IVAService;