// ========================================
// backend/services/IVACalculatorService.js
// Servicio para cálculo correcto de IVA según reglas del negocio
// ========================================

const Database = require('../models/Database');

class IVACalculatorService {

    /**
     * Determinar si aplica IVA según tipo de servicio y estrato del cliente
     * 
     * REGLAS DE NEGOCIO:
     * - Internet estratos 1,2,3: Sin IVA (0%)
     * - Internet estratos 4,5,6: Con IVA (19%)
     * - Televisión: Siempre con IVA (19%)
     * - Reconexión y varios: Con IVA (19%)
     * - Publicidad: Sin IVA (0%)
     * - Intereses: Sin IVA (0%)
     * 
     * @param {string} tipoServicio - internet, television, reconexion, varios, publicidad, interes
     * @param {number} estrato - Estrato del cliente (1-6)
     * @returns {object} { aplica: boolean, porcentaje: number }
     */
    static determinarIVA(tipoServicio, estrato = 3) {
         const estratoNumerico = parseInt(estrato) || 3;

        switch (tipoServicio.toLowerCase()) {
            case 'internet':
                return {
                    aplica: estratoNumerico >= 4,  // ✅ CORREGIDO: >= 4 (no > 3)
                    porcentaje: estratoNumerico >= 4 ? 19 : 0
                };

            case 'television':
                return {
                    aplica: true,
                    porcentaje: 19
                };

            case 'reconexion':
            case 'varios':
                return {
                    aplica: true,
                    porcentaje: 19
                };

            case 'publicidad':
            case 'interes':
            case 'descuento':
                return {
                    aplica: false,
                    porcentaje: 0
                };

            case 'combo':
            case 'empaquetado':
                // ⚠️ IMPORTANTE: Los combos SIEMPRE llevan IVA porque incluyen TV
                // TV siempre lleva IVA del 19%, independientemente del estrato
                // Incluso si solo Internet en estrato 1-3 no llevaría IVA,
                // la parte de TV SIEMPRE debe llevar IVA
                return {
                    aplica: true,  // Siempre aplica porque incluye TV
                    porcentaje: 19
                };

            default:
                return {
                    aplica: false,
                    porcentaje: 0
                };
        }
    }

    /**
     * Calcular precio con IVA aplicado
     * @param {number} precioBase - Precio sin IVA
     * @param {string} tipoServicio - Tipo de servicio
     * @param {number} estrato - Estrato del cliente
     * @returns {object} { precio_sin_iva, precio_con_iva, valor_iva, aplica_iva, porcentaje_iva }
     */
    static calcularPrecioConIVA(precioBase, tipoServicio, estrato = 3) {
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
            porcentaje_iva: configuracionIVA.porcentaje
        };
    }

    /**
     * Calcular precios de planes según estrato del cliente
     * @param {object} plan - Plan de servicio
     * @param {number} estrato - Estrato del cliente
     * @returns {object} Precios calculados con IVA
     */
    static calcularPreciosPlan(plan, estrato = 3) {
        const resultado = {
            plan_id: plan.id,
            codigo: plan.codigo,
            nombre: plan.nombre,
            tipo: plan.tipo,
            estrato_cliente: estrato,
            precios: {}
        };

        // Calcular precio de internet si aplica
        if (plan.precio_internet && plan.precio_internet > 0) {
            resultado.precios.internet = this.calcularPrecioConIVA(
                plan.precio_internet,
                'internet',
                estrato
            );
        }

        // Calcular precio de televisión si aplica
        if (plan.precio_television && plan.precio_television > 0) {
            // Para TV, el precio en BD ya incluye IVA, debemos separarlo
            const precioTVSinIVA = Math.round(plan.precio_television / 1.19);
            resultado.precios.television = this.calcularPrecioConIVA(
                precioTVSinIVA,
                'television',
                estrato
            );
        }

        // Precio total del plan
        if (plan.tipo === 'combo') {
            const totalSinIVA = (resultado.precios.internet?.precio_sin_iva || 0) +
                (resultado.precios.television?.precio_sin_iva || 0);
            const totalConIVA = (resultado.precios.internet?.precio_con_iva || 0) +
                (resultado.precios.television?.precio_con_iva || 0);
            const totalIVA = totalConIVA - totalSinIVA;

            resultado.precios.total = {
                precio_sin_iva: totalSinIVA,
                precio_con_iva: totalConIVA,
                valor_iva: totalIVA,
                aplica_iva: totalIVA > 0,
                porcentaje_iva: totalIVA > 0 ? 19 : 0
            };
        } else {
            // Para planes simples, usar el precio principal
            const tipoServicio = plan.tipo === 'internet' ? 'internet' : 'television';
            const precioBase = plan.tipo === 'internet' ? plan.precio_internet :
                Math.round(plan.precio_television / 1.19);

            resultado.precios.total = this.calcularPrecioConIVA(
                precioBase,
                tipoServicio,
                estrato
            );
        }

        return resultado;
    }

    /**
     * Obtener configuración de IVA desde la base de datos
     * @param {string} tipoServicio 
     * @param {number} estrato 
     * @returns {object} Configuración de IVA
     */
    static async obtenerConfiguracionIVA(tipoServicio, estrato) {
        try {
            const query = `
        SELECT aplica_iva, porcentaje_iva, descripcion
        FROM configuracion_iva 
        WHERE tipo_servicio = ? 
          AND estrato_desde <= ? 
          AND estrato_hasta >= ?
          AND activo = 1
        LIMIT 1
      `;

            const resultado = await Database.query(query, [tipoServicio, estrato, estrato]);

            if (resultado.length > 0) {
                return {
                    aplica: Boolean(resultado[0].aplica_iva),
                    porcentaje: parseFloat(resultado[0].porcentaje_iva) || 0,
                    descripcion: resultado[0].descripcion
                };
            }

            // Si no hay configuración, usar reglas por defecto
            return this.determinarIVA(tipoServicio, estrato);

        } catch (error) {
            console.error('Error obteniendo configuración IVA:', error);
            return this.determinarIVA(tipoServicio, estrato);
        }
    }

    /**
     * Validar y calcular conceptos de facturación con IVA correcto
     * @param {array} conceptos - Array de conceptos a facturar
     * @param {object} cliente - Datos del cliente
     * @returns {array} Conceptos con IVA calculado
     */
    static async calcularConceptosConIVA(conceptos, cliente) {
        const conceptosCalculados = [];
        const estrato = cliente.estrato || 3;

        for (const concepto of conceptos) {
            const configuracionIVA = await this.obtenerConfiguracionIVA(concepto.tipo, estrato);

            const conceptoCalculado = {
                ...concepto,
                estrato_cliente: estrato,
                precio_sin_iva: Math.round(concepto.valor || 0),
                aplica_iva: configuracionIVA.aplica,
                porcentaje_iva: configuracionIVA.porcentaje,
                valor_iva: 0,
                precio_con_iva: Math.round(concepto.valor || 0)
            };

            // Calcular IVA si aplica
            if (configuracionIVA.aplica) {
                conceptoCalculado.valor_iva = Math.round(
                    conceptoCalculado.precio_sin_iva * (configuracionIVA.porcentaje / 100)
                );
                conceptoCalculado.precio_con_iva =
                    conceptoCalculado.precio_sin_iva + conceptoCalculado.valor_iva;
            }

            conceptosCalculados.push(conceptoCalculado);
        }

        return conceptosCalculados;
    }

    /**
     * Generar resumen de impuestos para factura
     * @param {array} conceptos - Conceptos calculados con IVA
     * @returns {object} Resumen de impuestos
     */
    static generarResumenImpuestos(conceptos) {
        const resumen = {
            subtotal: 0,
            total_iva: 0,
            total_con_iva: 0,
            desglose_iva: {
                internet: { base: 0, iva: 0 },
                television: { base: 0, iva: 0 },
                reconexion: { base: 0, iva: 0 },
                varios: { base: 0, iva: 0 },
                publicidad: { base: 0, iva: 0 },
                interes: { base: 0, iva: 0 },
                descuento: { base: 0, iva: 0 }
            }
        };

        conceptos.forEach(concepto => {
            const tipo = concepto.tipo || 'varios';
            const base = concepto.precio_sin_iva || 0;
            const iva = concepto.valor_iva || 0;

            resumen.subtotal += base;
            resumen.total_iva += iva;

            if (resumen.desglose_iva[tipo]) {
                resumen.desglose_iva[tipo].base += base;
                resumen.desglose_iva[tipo].iva += iva;
            }
        });

        resumen.total_con_iva = resumen.subtotal + resumen.total_iva;

        // Redondear todos los valores
        resumen.subtotal = Math.round(resumen.subtotal);
        resumen.total_iva = Math.round(resumen.total_iva);
        resumen.total_con_iva = Math.round(resumen.total_con_iva);

        Object.keys(resumen.desglose_iva).forEach(tipo => {
            resumen.desglose_iva[tipo].base = Math.round(resumen.desglose_iva[tipo].base);
            resumen.desglose_iva[tipo].iva = Math.round(resumen.desglose_iva[tipo].iva);
        });

        return resumen;
    }

    /**
     * Obtener descripción de aplicación de IVA para mostrar al usuario
     * @param {string} tipoServicio 
     * @param {number} estrato 
     * @returns {string} Descripción
     */
    static obtenerDescripcionIVA(tipoServicio, estrato) {
        const config = this.determinarIVA(tipoServicio, estrato);

        if (!config.aplica) {
            return `${tipoServicio.toUpperCase()}: Sin IVA (Estrato ${estrato})`;
        }

        return `${tipoServicio.toUpperCase()}: IVA ${config.porcentaje}% (Estrato ${estrato})`;
    }
}

module.exports = IVACalculatorService;