// controllers/reportesRegulatoriosController.js
const { Database } = require('../models/Database');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class ReportesRegulatoriosController {
    constructor() {
        // Database es una clase estática, no necesita instancia
        this.db = Database;
    }

    // Reporte de Suscriptores y Asociados de Televisión Cerrada (Res. 00175 - F6)
    async generarReporteSuscriptoresTv(req, res) {
        try {
            const { anno, trimestre } = req.query;
            
            if (!anno || !trimestre) {
                return res.status(400).json({ error: 'Año y trimestre son requeridos' });
            }
            
            const query = `
                SELECT 
                    ? as ANNO,
                    ? as TRIMESTRE,
                    MONTH(f.fecha_emision) as MES_DEL_TRIMESTRE,
                    c.ciudad_id as CODIGO_DANE_MUNICIPIO,
                    '0001' as CODIGO_DANE_CENTRO_POBLADO,
                    ci.nombre as NOMBRE_CENTRO_POBLADO,
                    'IPTV' as MODALIDAD_SERVICIO_TELEVISION,
                    CASE 
                        WHEN c.estrato IN ('1','2','3') THEN 'RESIDENCIAL'
                        ELSE 'EMPRESARIAL'
                    END as SEGMENTO,
                    'FIBRA_OPTICA' as TIPO_TECNOLOGIA,
                    COUNT(DISTINCT sc.cliente_id) as NUMERO_TOTAL_CONEXIONES
                FROM servicios_cliente sc
                JOIN clientes c ON sc.cliente_id = c.id
                JOIN ciudades ci ON c.ciudad_id = ci.id
                JOIN planes_servicio ps ON sc.plan_id = ps.id
                LEFT JOIN facturas f ON c.id = f.cliente_id 
                    AND YEAR(f.fecha_emision) = ? 
                    AND QUARTER(f.fecha_emision) = ?
                WHERE ps.tipo IN ('television', 'combo')
                    AND sc.estado = 'activo'
                    AND c.estado = 'activo'
                GROUP BY 
                    c.ciudad_id, 
                    ci.nombre,
                    CASE WHEN c.estrato IN ('1','2','3') THEN 'RESIDENCIAL' ELSE 'EMPRESARIAL' END,
                    MONTH(f.fecha_emision)
                ORDER BY c.ciudad_id, MES_DEL_TRIMESTRE
            `;
            
            const datos = await this.db.query(query, [anno, trimestre, anno, trimestre]);
            
            // Si no hay datos, crear una fila vacía con la estructura
            if (datos.length === 0) {
                datos.push({
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: 1,
                    CODIGO_DANE_MUNICIPIO: '',
                    CODIGO_DANE_CENTRO_POBLADO: '',
                    NOMBRE_CENTRO_POBLADO: '',
                    MODALIDAD_SERVICIO_TELEVISION: '',
                    SEGMENTO: '',
                    TIPO_TECNOLOGIA: '',
                    NUMERO_TOTAL_CONEXIONES: 0
                });
            }
            
            // Crear workbook
            const wb = XLSX.utils.book_new();
            
            // Hoja de datos
            const ws = XLSX.utils.json_to_sheet(datos);
            
            // Configurar ancho de columnas
            const colWidths = [
                { wch: 6 },  // ANNO
                { wch: 10 }, // TRIMESTRE
                { wch: 18 }, // MES_DEL_TRIMESTRE
                { wch: 25 }, // CODIGO_DANE_MUNICIPIO
                { wch: 30 }, // CODIGO_DANE_CENTRO_POBLADO
                { wch: 30 }, // NOMBRE_CENTRO_POBLADO
                { wch: 30 }, // MODALIDAD_SERVICIO_TELEVISION
                { wch: 15 }, // SEGMENTO
                { wch: 20 }, // TIPO_TECNOLOGIA
                { wch: 25 }  // NUMERO_TOTAL_CONEXIONES
            ];
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, "SUSCRIP_ASOCI_TV_CERRADA");
            
            // Hoja de información
            const infoData = [
                ["Información de Control. No editar, mover o eliminar esta hoja."],
                ["Nombre de la Plantilla", "Res. 00175 - F6. Suscriptores y asociados de televisión cerrada"],
                ["Descripción de la Plantilla", "Esta plantilla contiene la información reportada del formato: Suscriptores y asociados de televisión cerrada"],
                ["Código de la Plantilla", 301]
            ];
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, wsInfo, "INFO");
            
            // Generar buffer del archivo
            const buffer = XLSX.write(wb, { 
                type: 'buffer', 
                bookType: 'xlsx',
                compression: true
            });
            
            // Configurar headers de respuesta
            const filename = `Suscriptores_TV_${anno}_T${trimestre}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            
            // Enviar archivo
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte suscriptores TV:', error);
            res.status(500).json({ error: 'Error generando reporte de suscriptores TV', details: error.message });
        }
    }

    // Reporte de Planes Tarifarios (Res. 6333 - T.1.2)
    async generarReportePlanesTarifarios(req, res) {
        try {
            const { anno, semestre } = req.query;
            
            const query = `
                SELECT 
                    ? as ANNO,
                    ? as SEMESTRE,
                    ps.codigo as CODIGO_PLAN,
                    ps.nombre as NOMBRE_PLAN,
                    c.ciudad_id as ID_MUNICIPIO,
                    CASE 
                        WHEN c.estrato IN ('1','2','3') THEN 1
                        ELSE 2
                    END as ID_SEGMENTO_PLANES,
                    ROUND(ps.precio * (1 + cfg.porcentaje_iva/100), 2) as VALOR_PLAN_IMPUESTOS,
                    ps.precio as VALOR_PLAN,
                    CASE ps.tipo
                        WHEN 'internet' THEN 1
                        WHEN 'television' THEN 2
                        WHEN 'combo' THEN 3
                    END as ID_MODALIDAD_PLAN,
                    DATE_FORMAT(ps.created_at, '%Y-%m-%d') as FECHA_INICIO,
                    NULL as FECHA_FIN,
                    CASE WHEN ps.tipo IN ('combo') THEN 'SI' ELSE 'NO' END as TIENE_TELEFONIA_FIJA,
                    CASE WHEN ps.tipo IN ('combo') THEN ps.codigo ELSE NULL END as CODIGO_PLAN_TEL_FIJA,
                    CASE WHEN ps.tipo IN ('combo') THEN 0 ELSE NULL END as TARIFA_TELEFONIA_FIJA,
                    CASE WHEN ps.tipo IN ('combo') THEN 0 ELSE NULL END as CANTIDAD_MINUTOS,
                    CASE WHEN ps.tipo IN ('internet', 'combo') THEN 'SI' ELSE 'NO' END as TIENE_INTERNET_FIJO,
                    CASE WHEN ps.tipo IN ('internet', 'combo') THEN ps.codigo ELSE NULL END as CODIGO_PLAN_INT_FI,
                    CASE WHEN ps.tipo IN ('internet', 'combo') THEN ps.precio ELSE NULL END as TARIFA_MENSUAL_INTERNET,
                    ps.velocidad_bajada as VELOCIDAD_OFRECIDA_BAJADA,
                    ps.velocidad_subida as VELOCIDAD_OFRECIDA_SUBIDA,
                    1 as ID_TECNOLOGIA
                FROM planes_servicio ps
                CROSS JOIN configuracion_empresa cfg
                LEFT JOIN servicios_cliente sc ON ps.id = sc.plan_id
                LEFT JOIN clientes c ON sc.cliente_id = c.id
                WHERE ps.activo = 1
                GROUP BY ps.id, c.ciudad_id
                ORDER BY ps.codigo, c.ciudad_id
            `;
            
            const datos = await this.db.query(query, [anno, semestre]);
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datos);
            XLSX.utils.book_append_sheet(wb, ws, "PLANES_TARIFARIOS_SERVIC_FIJOS");
            
            // Hoja INFO
            const infoData = [
                ["Información de Control. No editar, mover o eliminar esta hoja."],
                ["Nombre de la Plantilla", "Res. 6333 - T.1.2. Planes tarifarios individuales y empaquetados de servicios fijos"],
                ["Descripción de la Plantilla", "Res. 6333 - T.1.2 Planes tarifarios individuales y empaquetados de servicios fijos"],
                ["Código de la Plantilla", 345]
            ];
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, wsInfo, "INFO");
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Planes_Tarifarios_${anno}_S${semestre}.xlsx"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte planes tarifarios:', error);
            res.status(500).json({ error: 'Error generando reporte de planes tarifarios' });
        }
    }

    // Reporte de Líneas y Valores Facturados (Res. 6333 - T.1.3)
    async generarReporteLineasValores(req, res) {
        try {
            const { anno, trimestre } = req.query;
            
            const query = `
                SELECT 
                    ? as ANNO,
                    ? as TRIMESTRE,
                    c.ciudad_id as ID_MUNICIPIO,
                    CASE 
                        WHEN c.estrato IN ('1','2','3') THEN 1
                        ELSE 2
                    END as ID_SEGMENTO,
                    CASE ps.tipo
                        WHEN 'internet' THEN 1
                        WHEN 'television' THEN 2
                        WHEN 'combo' THEN 3
                    END as ID_SERVICIO_PAQUETE,
                    ps.velocidad_bajada as VELOCIDAD_EFECTIVA_DOWNSTREAM,
                    ps.velocidad_subida as VELOCIDAD_EFECTIVA_UPSTREAM,
                    1 as ID_TECNOLOGIA_ACCESO,
                    CASE sc.estado
                        WHEN 'activo' THEN 1
                        WHEN 'suspendido' THEN 2
                        WHEN 'cortado' THEN 3
                        ELSE 4
                    END as ID_ESTADO,
                    COUNT(DISTINCT sc.cliente_id) as CANTIDAD_LINEAS_ACCESOS,
                    COALESCE(SUM(f.total), 0) as VALOR_FACTURADO_O_COBRADO,
                    0 as OTROS_VALORES_FACTURADOS
                FROM servicios_cliente sc
                JOIN clientes c ON sc.cliente_id = c.id
                JOIN planes_servicio ps ON sc.plan_id = ps.id
                LEFT JOIN facturas f ON c.id = f.cliente_id 
                    AND YEAR(f.fecha_emision) = ? 
                    AND QUARTER(f.fecha_emision) = ?
                    AND f.estado = 'pagada'
                WHERE YEAR(sc.created_at) <= ?
                GROUP BY 
                    c.ciudad_id,
                    CASE WHEN c.estrato IN ('1','2','3') THEN 1 ELSE 2 END,
                    CASE ps.tipo WHEN 'internet' THEN 1 WHEN 'television' THEN 2 WHEN 'combo' THEN 3 END,
                    ps.velocidad_bajada,
                    ps.velocidad_subida,
                    CASE sc.estado WHEN 'activo' THEN 1 WHEN 'suspendido' THEN 2 WHEN 'cortado' THEN 3 ELSE 4 END
                ORDER BY c.ciudad_id, ID_SEGMENTO, ID_SERVICIO_PAQUETE
            `;
            
            const datos = await this.db.query(query, [anno, trimestre, anno, trimestre, anno]);
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datos);
            XLSX.utils.book_append_sheet(wb, ws, "LINEAS_VALORES_FACT_SERV_FIJOS");
            
            // Hoja INFO
            const infoData = [
                ["Información de Control. No editar, mover o eliminar esta hoja."],
                ["Nombre de la Plantilla", "Res. 6333 - T.1.3. Líneas o accesos y valores facturados o cobrados de servicios fijos individuales y empaquetados"],
                ["Descripción de la Plantilla", "Res. 6333 - T.1.3 Líneas o accesos y valores facturados o cobrados de servicios fijos individuales y empaquetados"],
                ["Código de la Plantilla", 346]
            ];
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, wsInfo, "INFO");
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Lineas_Valores_${anno}_T${trimestre}.xlsx"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte líneas y valores:', error);
            res.status(500).json({ error: 'Error generando reporte de líneas y valores' });
        }
    }

    // Reporte de Disponibilidad del Servicio QoS (Res. 6333 - T.2.1.B)
    async generarReporteDisponibilidad(req, res) {
        try {
            const { anno, semestre } = req.query;
            
            // Para este reporte necesitarías una tabla de incidencias/mantenimiento
            // Por ahora simulo con un 99.5% de disponibilidad
            const datosDisponibilidad = [];
            const mesesSemestre = semestre === '1' ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
            
            for (const mes of mesesSemestre) {
                datosDisponibilidad.push({
                    ANNO: parseInt(anno),
                    SEMESTRE: parseInt(semestre),
                    MES_TOTAL: mes,
                    DISPONIBLIDAD_SERVICIO: 99.5
                });
            }
            
            const datosIncidencias = [
                // Aquí irían las incidencias reales desde una tabla de incidencias
                // Por ahora está vacío como ejemplo
            ];
            
            const wb = XLSX.utils.book_new();
            
            // Hoja de disponibilidad
            const wsDisp = XLSX.utils.json_to_sheet(datosDisponibilidad);
            XLSX.utils.book_append_sheet(wb, wsDisp, "DISP_SERVICIO_HFC_IPTV_Y_SATEL");
            
            // Hoja de incidencias
            const wsInc = XLSX.utils.json_to_sheet(datosIncidencias);
            XLSX.utils.book_append_sheet(wb, wsInc, "INCIDENC_SERV_HFC_IPTV_Y_SATEL");
            
            // Hoja INFO
            const infoData = [
                ["Información de Control. No editar, mover o eliminar esta hoja."],
                ["Nombre de la Plantilla", "Res. 6333 - T.2.1.B Reporte QoS1 disponibilidad del servicio HFC IPTV y Satélite"],
                ["Descripción de la Plantilla", "Res. 6333 - T.2.1.B Reporte QoS1 disponibilidad del servicio HFC IPTV y Satélite"],
                ["Código de la Plantilla", 353]
            ];
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, wsInfo, "INFO");
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Disponibilidad_QoS_${anno}_S${semestre}.xlsx"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte disponibilidad:', error);
            res.status(500).json({ error: 'Error generando reporte de disponibilidad' });
        }
    }

    // Reporte de Monitoreo de Quejas (Res. 6755 - T.4.2)
    async generarReporteQuejas(req, res) {
        try {
            const { anno, trimestre } = req.query;
            
            // Este reporte requeriría una tabla de quejas/PQR
            // Por ahora simulo datos básicos
            const datosQuejas = [
                {
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: 1,
                    ID_SERVICIO: 1, // Internet
                    EMPAQUETADO: 'NO',
                    ID_TIPOLOGIA: 1, // Facturación
                    ID_MEDIO_ATENCION: 1, // Telefónico
                    NUMERO_QUEJAS: 0
                }
            ];
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datosQuejas);
            XLSX.utils.book_append_sheet(wb, ws, "MONITOREO_DE_QUEJAS");
            
            // Hoja INFO
            const infoData = [
                ["Información de Control. No editar, mover o eliminar esta hoja."],
                ["Nombre de la Plantilla", "Res. 6755 - Formato T 4.2. Monitoreo de quejas"],
                ["Descripción de la Plantilla", "PERIODICIDAD: Trimestral o Anual"],
                ["Código de la Plantilla", 374]
            ];
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, wsInfo, "INFO");
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Monitoreo_Quejas_${anno}_T${trimestre}.xlsx"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte quejas:', error);
            res.status(500).json({ error: 'Error generando reporte de quejas' });
        }
    }

    // Reporte de Indicadores de Quejas y Peticiones (Res. 6755 - T.4.3)
    async generarReporteIndicadoresQuejas(req, res) {
        try {
            const { anno, trimestre } = req.query;
            
            const datosIndicadores = [
                {
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: 1,
                    NUMERO_QUEJAS_A_FAVOR: 0,
                    NUMERO_QUEJAS_EN_CONTRA: 0,
                    NUMERO_QUEJAS_PRESENTADAS: 0,
                    NUMERO_PETICIONES: 0
                }
            ];
            
            const datosSegundaInstancia = [
                {
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: 1,
                    NUMERO_REPOSICION_A_FAVOR: 0,
                    NUMERO_REPOSICION_EN_CONTRA: 0,
                    NUMERO_REPOSICION_PRESENTADOS: 0,
                    NUMERO_RECURSOS_APELACION: 0
                }
            ];
            
            const datosSatisfaccion = [
                {
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: 1,
                    ID_MEDIO_ATENCION: 1,
                    USUARIOS_NS_MUY_INSATISFECHO: 0,
                    USUARIOS_NS_INSATISFECHO: 0,
                    USUAR_NS_NI_INSATISF_NI_SATISF: 0,
                    USUARIOS_NS_SATISFECHO: 0,
                    USUARIOS_NS_MUY_SATISFECHO: 0
                }
            ];
            
            const wb = XLSX.utils.book_new();
            
            const ws1 = XLSX.utils.json_to_sheet(datosIndicadores);
            XLSX.utils.book_append_sheet(wb, ws1, "QUEJAS_Y_PETICIONES");
            
            const ws2 = XLSX.utils.json_to_sheet(datosSegundaInstancia);
            XLSX.utils.book_append_sheet(wb, ws2, "QUEJAS_SEGUNDA_INSTANCIA");
            
            const ws3 = XLSX.utils.json_to_sheet(datosSatisfaccion);
            XLSX.utils.book_append_sheet(wb, ws3, "SATISFACCION_USUARIOS");
            
            // Hoja INFO
            const infoData = [
                ["Información de Control. No editar, mover o eliminar esta hoja."],
                ["Nombre de la Plantilla", "Res. 6755 - Formato T 4.3 Indicadores de quejas y peticiones"],
                ["Descripción de la Plantilla", "PERIODICIDAD: Trimestral o Anual"],
                ["Código de la Plantilla", 375]
            ];
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
            XLSX.utils.book_append_sheet(wb, wsInfo, "INFO");
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Indicadores_Quejas_${anno}_T${trimestre}.xlsx"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte indicadores quejas:', error);
            res.status(500).json({ error: 'Error generando reporte de indicadores de quejas' });
        }
    }

    // Reporte de Facturas de Ventas (Modelo Contable)
    async generarReporteFacturasVentas(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;
            
            const query = `
                SELECT 
                    3 as 'Tipo de comprobante',
                    f.numero_factura as 'Consecutivo',
                    f.identificacion_cliente as 'Identificación tercero',
                    '' as 'Sucursal',
                    '' as 'Código centro/subcentro de costos',
                    f.fecha_emision as 'Fecha de elaboración',
                    'COP' as 'Sigla Moneda',
                    1 as 'Tasa de cambio',
                    '' as 'Nombre contacto',
                    c.correo as 'Email Contacto',
                    '' as 'Orden de compra',
                    '' as 'Orden de entrega',
                    '' as 'Fecha orden de entrega',
                    cf.codigo as 'Código producto',
                    cf.nombre as 'Descripción producto',
                    '' as 'Identificación vendedor',
                    '' as 'Código de Bodega',
                    df.cantidad as 'Cantidad producto',
                    df.precio_unitario as 'Valor unitario',
                    df.descuento as 'Valor Descuento',
                    0 as 'Base AIU',
                    0 as 'Porcentaje AIU',
                    0 as 'Valor AIU',
                    df.subtotal as 'Base gravable',
                    CASE WHEN cf.aplica_iva = 1 THEN cf.porcentaje_iva ELSE 0 END as 'Porcentaje impuesto',
                    df.iva as 'Valor impuesto',
                    0 as 'Base exenta',
                    0 as 'Base excluida',
                    df.total as 'Valor total'
                FROM facturas f
                JOIN clientes c ON f.cliente_id = c.id
                JOIN detalle_facturas df ON f.id = df.factura_id
                LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
                WHERE f.fecha_emision BETWEEN ? AND ?
                    AND f.estado IN ('pagada', 'pendiente')
                ORDER BY f.fecha_emision, f.numero_factura
            `;
            
            const datos = await this.db.query(query, [fechaInicio, fechaFin]);
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datos);
            XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Facturas_Ventas_${fechaInicio}_${fechaFin}.xlsx"`);
            res.send(buffer);
            
        } catch (error) {
            console.error('Error generando reporte facturas ventas:', error);
            res.status(500).json({ error: 'Error generando reporte de facturas de ventas' });
        }
    }

    // Método para obtener lista de reportes disponibles
    async obtenerReportesDisponibles(req, res) {
        try {
            const reportes = [
                {
                    id: 'suscriptores_tv',
                    nombre: 'Suscriptores y Asociados de TV Cerrada',
                    descripcion: 'Res. 00175 - F6',
                    periodicidad: 'Trimestral',
                    parametros: ['anno', 'trimestre']
                },
                {
                    id: 'planes_tarifarios',
                    nombre: 'Planes Tarifarios de Servicios Fijos',
                    descripcion: 'Res. 6333 - T.1.2',
                    periodicidad: 'Semestral',
                    parametros: ['anno', 'semestre']
                },
                {
                    id: 'lineas_valores',
                    nombre: 'Líneas y Valores Facturados',
                    descripcion: 'Res. 6333 - T.1.3',
                    periodicidad: 'Trimestral',
                    parametros: ['anno', 'trimestre']
                },
                {
                    id: 'disponibilidad_qos',
                    nombre: 'Disponibilidad del Servicio QoS',
                    descripcion: 'Res. 6333 - T.2.1.B',
                    periodicidad: 'Semestral',
                    parametros: ['anno', 'semestre']
                },
                {
                    id: 'monitoreo_quejas',
                    nombre: 'Monitoreo de Quejas',
                    descripcion: 'Res. 6755 - T.4.2',
                    periodicidad: 'Trimestral',
                    parametros: ['anno', 'trimestre']
                },
                {
                    id: 'indicadores_quejas',
                    nombre: 'Indicadores de Quejas y Peticiones',
                    descripcion: 'Res. 6755 - T.4.3',
                    periodicidad: 'Trimestral',
                    parametros: ['anno', 'trimestre']
                },
                {
                    id: 'facturas_ventas',
                    nombre: 'Facturas de Ventas (Modelo Contable)',
                    descripcion: 'Reporte para importación contable',
                    periodicidad: 'Según rango de fechas',
                    parametros: ['fechaInicio', 'fechaFin']
                }
            ];
            
            res.json({ reportes });
        } catch (error) {
            console.error('Error obteniendo reportes disponibles:', error);
            res.status(500).json({ error: 'Error obteniendo lista de reportes' });
        }
    }
}

module.exports = ReportesRegulatoriosController;