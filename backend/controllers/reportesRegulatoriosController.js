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

            // Calcular meses del trimestre
            const mesesTrimestre = {
                '1': [1, 2, 3],
                '2': [4, 5, 6],
                '3': [7, 8, 9],
                '4': [10, 11, 12]
            };

            const meses = mesesTrimestre[trimestre];
            if (!meses) {
                return res.status(400).json({ error: 'Trimestre inválido' });
            }

            const query = `
                SELECT
                    ? as ANNO,
                    ? as TRIMESTRE,
                    m.mes as MES_DEL_TRIMESTRE,
                    ci.codigo as CODIGO_DANE_MUNICIPIO,
                    '0001' as CODIGO_DANE_CENTRO_POBLADO,
                    ci.nombre as NOMBRE_CENTRO_POBLADO,
                    CASE
                        WHEN ps.tecnologia LIKE '%IPTV%' OR ps.tecnologia LIKE '%IP TV%' THEN 'IPTV'
                        WHEN ps.tecnologia LIKE '%Cable%' OR ps.tecnologia LIKE '%HFC%' THEN 'CABLE'
                        WHEN ps.tecnologia LIKE '%Satelit%' THEN 'SATELITE'
                        WHEN ps.tecnologia LIKE '%DTH%' THEN 'DTH'
                        ELSE 'IPTV'
                    END as MODALIDAD_SERVICIO_TELEVISION,
                    CASE
                        WHEN c.estrato IN ('1','2','3') THEN 'RESIDENCIAL'
                        ELSE 'EMPRESARIAL'
                    END as SEGMENTO,
                    UPPER(REPLACE(REPLACE(ps.tecnologia, 'á', 'a'), ' ', '_')) as TIPO_TECNOLOGIA,
                    COUNT(DISTINCT sc.cliente_id) as NUMERO_TOTAL_CONEXIONES
                FROM (
                    SELECT ? as mes UNION ALL SELECT ? UNION ALL SELECT ?
                ) m
                CROSS JOIN ciudades ci
                LEFT JOIN clientes c ON c.ciudad_id = ci.id
                    AND c.estado = 'activo'
                LEFT JOIN servicios_cliente sc ON sc.cliente_id = c.id
                    AND sc.estado = 'activo'
                    AND DATE_FORMAT(sc.fecha_activacion, '%Y-%m') <= CONCAT(?, '-', LPAD(m.mes, 2, '0'))
                LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
                    AND ps.tipo IN ('television', 'combo')
                    AND ps.activo = 1
                WHERE ci.id IN (SELECT DISTINCT ciudad_id FROM clientes WHERE ciudad_id IS NOT NULL)
                GROUP BY
                    m.mes,
                    ci.codigo,
                    ci.nombre,
                    CASE WHEN ps.tecnologia LIKE '%IPTV%' OR ps.tecnologia LIKE '%IP TV%' THEN 'IPTV'
                         WHEN ps.tecnologia LIKE '%Cable%' OR ps.tecnologia LIKE '%HFC%' THEN 'CABLE'
                         WHEN ps.tecnologia LIKE '%Satelit%' THEN 'SATELITE'
                         WHEN ps.tecnologia LIKE '%DTH%' THEN 'DTH'
                         ELSE 'IPTV' END,
                    CASE WHEN c.estrato IN ('1','2','3') THEN 'RESIDENCIAL' ELSE 'EMPRESARIAL' END,
                    ps.tecnologia
                HAVING NUMERO_TOTAL_CONEXIONES > 0
                ORDER BY ci.codigo, m.mes
            `;

            const datos = await this.db.query(query, [
                meses[0], meses[1], meses[2],
                anno
            ]);
            
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

            if (!anno || !semestre) {
                return res.status(400).json({ error: 'Año y semestre son requeridos' });
            }

            const query = `
                SELECT
                    ? as ANNO,
                    ? as SEMESTRE,
                    ps.codigo as CODIGO_PLAN,
                    ps.nombre as NOMBRE_PLAN,
                    ci.codigo as ID_MUNICIPIO,
                    CASE
                        WHEN seg.segmento = 'RESIDENCIAL' THEN 1
                        ELSE 2
                    END as ID_SEGMENTO_PLANES,
                    CASE
                        WHEN seg.segmento = 'RESIDENCIAL' AND ps.aplica_iva_estrato_123 = 1 THEN
                            ROUND(ps.precio * (1 + (SELECT porcentaje_iva FROM configuracion_empresa LIMIT 1)/100), 2)
                        WHEN seg.segmento != 'RESIDENCIAL' AND ps.aplica_iva_estrato_456 = 1 THEN
                            ROUND(ps.precio * (1 + (SELECT porcentaje_iva FROM configuracion_empresa LIMIT 1)/100), 2)
                        ELSE ps.precio
                    END as VALOR_PLAN_IMPUESTOS,
                    ps.precio as VALOR_PLAN,
                    CASE ps.tipo
                        WHEN 'internet' THEN 1
                        WHEN 'television' THEN 2
                        WHEN 'combo' THEN 3
                    END as ID_MODALIDAD_PLAN,
                    DATE_FORMAT(COALESCE(ps.fecha_inicio_promocion, ps.created_at), '%Y-%m-%d') as FECHA_INICIO,
                    DATE_FORMAT(ps.fecha_fin_promocion, '%Y-%m-%d') as FECHA_FIN,
                    'NO' as TIENE_TELEFONIA_FIJA,
                    NULL as CODIGO_PLAN_TEL_FIJA,
                    NULL as TARIFA_TELEFONIA_FIJA,
                    NULL as CANTIDAD_MINUTOS,
                    CASE WHEN ps.tipo IN ('internet', 'combo') THEN 'SI' ELSE 'NO' END as TIENE_INTERNET_FIJO,
                    CASE WHEN ps.tipo IN ('internet', 'combo') THEN ps.codigo ELSE NULL END as CODIGO_PLAN_INT_FI,
                    CASE
                        WHEN ps.tipo = 'internet' THEN ps.precio
                        WHEN ps.tipo = 'combo' THEN COALESCE(ps.precio_internet, ps.precio * 0.6)
                        ELSE NULL
                    END as TARIFA_MENSUAL_INTERNET,
                    COALESCE(ps.velocidad_bajada, 0) as VELOCIDAD_OFRECIDA_BAJADA,
                    COALESCE(ps.velocidad_subida, 0) as VELOCIDAD_OFRECIDA_SUBIDA,
                    CASE
                        WHEN ps.tecnologia LIKE '%Fibra%' OR ps.tecnologia LIKE '%FTTH%' THEN 1
                        WHEN ps.tecnologia LIKE '%Cable%' OR ps.tecnologia LIKE '%HFC%' THEN 2
                        WHEN ps.tecnologia LIKE '%Inalamb%' OR ps.tecnologia LIKE '%Wireless%' THEN 3
                        WHEN ps.tecnologia LIKE '%Satelit%' THEN 4
                        WHEN ps.tecnologia LIKE '%ADSL%' OR ps.tecnologia LIKE '%Cobre%' THEN 5
                        ELSE 1
                    END as ID_TECNOLOGIA
                FROM planes_servicio ps
                CROSS JOIN (SELECT 'RESIDENCIAL' as segmento UNION ALL SELECT 'EMPRESARIAL') seg
                CROSS JOIN ciudades ci
                WHERE ps.activo = 1
                    AND ci.id IN (SELECT DISTINCT ciudad_id FROM clientes WHERE ciudad_id IS NOT NULL)
                ORDER BY ps.codigo, ci.codigo, ID_SEGMENTO_PLANES
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

            if (!anno || !trimestre) {
                return res.status(400).json({ error: 'Año y trimestre son requeridos' });
            }

            // Calcular fechas del trimestre
            const mesesTrimestre = {
                '1': { inicio: `${anno}-01-01`, fin: `${anno}-03-31` },
                '2': { inicio: `${anno}-04-01`, fin: `${anno}-06-30` },
                '3': { inicio: `${anno}-07-01`, fin: `${anno}-09-30` },
                '4': { inicio: `${anno}-10-01`, fin: `${anno}-12-31` }
            };

            const periodo = mesesTrimestre[trimestre];
            if (!periodo) {
                return res.status(400).json({ error: 'Trimestre inválido' });
            }

            const query = `
                SELECT
                    ? as ANNO,
                    ? as TRIMESTRE,
                    ci.codigo as ID_MUNICIPIO,
                    CASE
                        WHEN c.estrato IN ('1','2','3') THEN 1
                        ELSE 2
                    END as ID_SEGMENTO,
                    CASE ps.tipo
                        WHEN 'internet' THEN 1
                        WHEN 'television' THEN 2
                        WHEN 'combo' THEN 3
                    END as ID_SERVICIO_PAQUETE,
                    COALESCE(ps.velocidad_bajada, 0) as VELOCIDAD_EFECTIVA_DOWNSTREAM,
                    COALESCE(ps.velocidad_subida, 0) as VELOCIDAD_EFECTIVA_UPSTREAM,
                    CASE
                        WHEN ps.tecnologia LIKE '%Fibra%' OR ps.tecnologia LIKE '%FTTH%' THEN 1
                        WHEN ps.tecnologia LIKE '%Cable%' OR ps.tecnologia LIKE '%HFC%' THEN 2
                        WHEN ps.tecnologia LIKE '%Inalamb%' OR ps.tecnologia LIKE '%Wireless%' THEN 3
                        WHEN ps.tecnologia LIKE '%Satelit%' THEN 4
                        WHEN ps.tecnologia LIKE '%ADSL%' OR ps.tecnologia LIKE '%Cobre%' THEN 5
                        ELSE 1
                    END as ID_TECNOLOGIA_ACCESO,
                    CASE sc.estado
                        WHEN 'activo' THEN 1
                        WHEN 'suspendido' THEN 2
                        WHEN 'cortado' THEN 3
                        WHEN 'cancelado' THEN 4
                        ELSE 4
                    END as ID_ESTADO,
                    COUNT(DISTINCT sc.id) as CANTIDAD_LINEAS_ACCESOS,
                    COALESCE(SUM(CASE
                        WHEN f.estado IN ('pagada', 'pendiente') THEN f.total
                        ELSE 0
                    END), 0) as VALOR_FACTURADO_O_COBRADO,
                    0 as OTROS_VALORES_FACTURADOS
                FROM servicios_cliente sc
                JOIN clientes c ON sc.cliente_id = c.id
                JOIN ciudades ci ON c.ciudad_id = ci.id
                JOIN planes_servicio ps ON sc.plan_id = ps.id
                LEFT JOIN facturas f ON c.id = f.cliente_id
                    AND f.fecha_emision BETWEEN ? AND ?
                WHERE sc.fecha_activacion <= ?
                    AND (sc.estado IN ('activo', 'suspendido', 'cortado')
                         OR (sc.estado = 'cancelado' AND sc.updated_at >= ?))
                GROUP BY
                    ci.codigo,
                    CASE WHEN c.estrato IN ('1','2','3') THEN 1 ELSE 2 END,
                    CASE ps.tipo WHEN 'internet' THEN 1 WHEN 'television' THEN 2 WHEN 'combo' THEN 3 END,
                    ps.velocidad_bajada,
                    ps.velocidad_subida,
                    CASE
                        WHEN ps.tecnologia LIKE '%Fibra%' OR ps.tecnologia LIKE '%FTTH%' THEN 1
                        WHEN ps.tecnologia LIKE '%Cable%' OR ps.tecnologia LIKE '%HFC%' THEN 2
                        WHEN ps.tecnologia LIKE '%Inalamb%' OR ps.tecnologia LIKE '%Wireless%' THEN 3
                        WHEN ps.tecnologia LIKE '%Satelit%' THEN 4
                        WHEN ps.tecnologia LIKE '%ADSL%' OR ps.tecnologia LIKE '%Cobre%' THEN 5
                        ELSE 1
                    END,
                    CASE sc.estado WHEN 'activo' THEN 1 WHEN 'suspendido' THEN 2 WHEN 'cortado' THEN 3 WHEN 'cancelado' THEN 4 ELSE 4 END
                HAVING CANTIDAD_LINEAS_ACCESOS > 0
                ORDER BY ci.codigo, ID_SEGMENTO, ID_SERVICIO_PAQUETE
            `;

            const datos = await this.db.query(query, [
                anno,
                trimestre,
                periodo.inicio,
                periodo.fin,
                periodo.fin,
                periodo.inicio
            ]);
            
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

            if (!anno || !semestre) {
                return res.status(400).json({ error: 'Año y semestre son requeridos' });
            }

            const mesesSemestre = semestre === '1' ? [1,2,3,4,5,6] : [7,8,9,10,11,12];

            // Query para disponibilidad mensual
            const queryDisponibilidad = `
                SELECT
                    ? as ANNO,
                    ? as SEMESTRE,
                    m.mes as MES_TOTAL,
                    COALESCE(
                        (SELECT disponibilidad_porcentaje
                         FROM metricas_qos
                         WHERE anno = ? AND mes = m.mes
                         ORDER BY fecha_medicion DESC
                         LIMIT 1),
                        99.50
                    ) as DISPONIBLIDAD_SERVICIO
                FROM (
                    SELECT ? as mes UNION ALL SELECT ? UNION ALL SELECT ?
                    UNION ALL SELECT ? UNION ALL SELECT ? UNION ALL SELECT ?
                ) m
                ORDER BY m.mes
            `;

            const datosDisponibilidad = await this.db.query(queryDisponibilidad, [
                anno,
                semestre,
                anno,
                mesesSemestre[0], mesesSemestre[1], mesesSemestre[2],
                mesesSemestre[3], mesesSemestre[4], mesesSemestre[5]
            ]);

            // Query para incidencias
            const queryIncidencias = `
                SELECT
                    i.numero_incidencia as NUMERO_INCIDENCIA,
                    CASE i.tipo_incidencia
                        WHEN 'programado' THEN 'Programado'
                        WHEN 'no_programado' THEN 'No Programado'
                        WHEN 'emergencia' THEN 'Emergencia'
                    END as TIPO_INCIDENCIA,
                    CASE i.categoria
                        WHEN 'fibra_cortada' THEN 'Fibra Cortada'
                        WHEN 'falla_energia' THEN 'Falla de Energía'
                        WHEN 'mantenimiento' THEN 'Mantenimiento'
                        WHEN 'actualizacion' THEN 'Actualización'
                        ELSE 'Otros'
                    END as CATEGORIA,
                    DATE_FORMAT(i.fecha_inicio, '%Y-%m-%d %H:%i:%s') as FECHA_INICIO,
                    DATE_FORMAT(i.fecha_fin, '%Y-%m-%d %H:%i:%s') as FECHA_FIN,
                    COALESCE(i.tiempo_duracion_minutos, 0) as DURACION_MINUTOS,
                    COALESCE(i.usuarios_afectados, 0) as USUARIOS_AFECTADOS,
                    ci.codigo as CODIGO_MUNICIPIO,
                    ci.nombre as MUNICIPIO,
                    i.descripcion as DESCRIPCION,
                    i.causa_raiz as CAUSA_RAIZ,
                    i.solucion_aplicada as SOLUCION_APLICADA,
                    CASE i.estado
                        WHEN 'reportado' THEN 'Reportado'
                        WHEN 'en_atencion' THEN 'En Atención'
                        WHEN 'resuelto' THEN 'Resuelto'
                        WHEN 'cerrado' THEN 'Cerrado'
                    END as ESTADO
                FROM incidencias_servicio i
                LEFT JOIN ciudades ci ON i.municipio_id = ci.id
                WHERE YEAR(i.fecha_inicio) = ?
                    AND MONTH(i.fecha_inicio) IN (?, ?, ?, ?, ?, ?)
                ORDER BY i.fecha_inicio DESC
            `;

            const datosIncidencias = await this.db.query(queryIncidencias, [
                anno,
                mesesSemestre[0], mesesSemestre[1], mesesSemestre[2],
                mesesSemestre[3], mesesSemestre[4], mesesSemestre[5]
            ]);
            
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

            if (!anno || !trimestre) {
                return res.status(400).json({ error: 'Año y trimestre son requeridos' });
            }

            // Calcular meses del trimestre
            const mesesTrimestre = {
                '1': [1, 2, 3],
                '2': [4, 5, 6],
                '3': [7, 8, 9],
                '4': [10, 11, 12]
            };

            const meses = mesesTrimestre[trimestre];
            if (!meses) {
                return res.status(400).json({ error: 'Trimestre inválido' });
            }

            const query = `
                SELECT
                    ? as ANNO,
                    ? as TRIMESTRE,
                    MONTH(p.fecha_recepcion) as MES_DEL_TRIMESTRE,
                    CASE
                        WHEN p.servicio_afectado = 'internet' THEN 1
                        WHEN p.servicio_afectado = 'television' THEN 2
                        WHEN p.servicio_afectado = 'combo' THEN 3
                        ELSE 1
                    END as ID_SERVICIO,
                    CASE
                        WHEN p.servicio_afectado = 'combo' THEN 'SI'
                        ELSE 'NO'
                    END as EMPAQUETADO,
                    CASE p.categoria
                        WHEN 'facturacion' THEN 1
                        WHEN 'tecnico' THEN 2
                        WHEN 'comercial' THEN 3
                        WHEN 'atencion_cliente' THEN 4
                        ELSE 5
                    END as ID_TIPOLOGIA,
                    CASE p.medio_recepcion
                        WHEN 'telefono' THEN 1
                        WHEN 'presencial' THEN 2
                        WHEN 'email' THEN 3
                        WHEN 'web' THEN 4
                        WHEN 'chat' THEN 5
                        ELSE 1
                    END as ID_MEDIO_ATENCION,
                    COUNT(*) as NUMERO_QUEJAS
                FROM pqr p
                WHERE YEAR(p.fecha_recepcion) = ?
                    AND QUARTER(p.fecha_recepcion) = ?
                    AND p.tipo IN ('queja', 'reclamo')
                GROUP BY
                    MONTH(p.fecha_recepcion),
                    p.servicio_afectado,
                    p.categoria,
                    p.medio_recepcion
                ORDER BY MES_DEL_TRIMESTRE, ID_SERVICIO, ID_TIPOLOGIA
            `;

            const datosQuejas = await this.db.query(query, [anno, trimestre, anno, trimestre]);

            // Si no hay datos, generar estructura vacía
            if (datosQuejas.length === 0) {
                for (const mes of meses) {
                    datosQuejas.push({
                        ANNO: parseInt(anno),
                        TRIMESTRE: parseInt(trimestre),
                        MES_DEL_TRIMESTRE: mes,
                        ID_SERVICIO: 1,
                        EMPAQUETADO: 'NO',
                        ID_TIPOLOGIA: 1,
                        ID_MEDIO_ATENCION: 1,
                        NUMERO_QUEJAS: 0
                    });
                }
            }
            
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

            if (!anno || !trimestre) {
                return res.status(400).json({ error: 'Año y trimestre son requeridos' });
            }

            // Calcular meses del trimestre
            const mesesTrimestre = {
                '1': [1, 2, 3],
                '2': [4, 5, 6],
                '3': [7, 8, 9],
                '4': [10, 11, 12]
            };

            const meses = mesesTrimestre[trimestre];
            if (!meses) {
                return res.status(400).json({ error: 'Trimestre inválido' });
            }

            // Query para quejas y peticiones
            const queryIndicadores = `
                SELECT
                    ? as ANNO,
                    ? as TRIMESTRE,
                    MONTH(fecha_recepcion) as MES_DEL_TRIMESTRE,
                    SUM(CASE WHEN tipo IN ('queja', 'reclamo') AND estado IN ('resuelto', 'cerrado')
                             AND respuesta LIKE '%favor del usuario%' THEN 1 ELSE 0 END) as NUMERO_QUEJAS_A_FAVOR,
                    SUM(CASE WHEN tipo IN ('queja', 'reclamo') AND estado IN ('resuelto', 'cerrado')
                             AND respuesta NOT LIKE '%favor del usuario%' THEN 1 ELSE 0 END) as NUMERO_QUEJAS_EN_CONTRA,
                    SUM(CASE WHEN tipo IN ('queja', 'reclamo') THEN 1 ELSE 0 END) as NUMERO_QUEJAS_PRESENTADAS,
                    SUM(CASE WHEN tipo = 'peticion' THEN 1 ELSE 0 END) as NUMERO_PETICIONES
                FROM pqr
                WHERE YEAR(fecha_recepcion) = ?
                    AND QUARTER(fecha_recepcion) = ?
                GROUP BY MONTH(fecha_recepcion)
                ORDER BY MES_DEL_TRIMESTRE
            `;

            let datosIndicadores = await this.db.query(queryIndicadores, [anno, trimestre, anno, trimestre]);

            // Rellenar meses faltantes
            if (datosIndicadores.length === 0) {
                datosIndicadores = meses.map(mes => ({
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: mes,
                    NUMERO_QUEJAS_A_FAVOR: 0,
                    NUMERO_QUEJAS_EN_CONTRA: 0,
                    NUMERO_QUEJAS_PRESENTADAS: 0,
                    NUMERO_PETICIONES: 0
                }));
            }

            // Query para segunda instancia (por ahora vacío ya que no tenemos recursos)
            const datosSegundaInstancia = meses.map(mes => ({
                ANNO: parseInt(anno),
                TRIMESTRE: parseInt(trimestre),
                MES_DEL_TRIMESTRE: mes,
                NUMERO_REPOSICION_A_FAVOR: 0,
                NUMERO_REPOSICION_EN_CONTRA: 0,
                NUMERO_REPOSICION_PRESENTADOS: 0,
                NUMERO_RECURSOS_APELACION: 0
            }));

            // Query para satisfacción
            const querySatisfaccion = `
                SELECT
                    ? as ANNO,
                    ? as TRIMESTRE,
                    MONTH(fecha_recepcion) as MES_DEL_TRIMESTRE,
                    CASE medio_recepcion
                        WHEN 'telefono' THEN 1
                        WHEN 'presencial' THEN 2
                        WHEN 'email' THEN 3
                        WHEN 'web' THEN 4
                        WHEN 'chat' THEN 5
                        ELSE 1
                    END as ID_MEDIO_ATENCION,
                    SUM(CASE WHEN satisfaccion_cliente = 'muy_insatisfecho' THEN 1 ELSE 0 END) as USUARIOS_NS_MUY_INSATISFECHO,
                    SUM(CASE WHEN satisfaccion_cliente = 'insatisfecho' THEN 1 ELSE 0 END) as USUARIOS_NS_INSATISFECHO,
                    SUM(CASE WHEN satisfaccion_cliente = 'neutral' THEN 1 ELSE 0 END) as USUAR_NS_NI_INSATISF_NI_SATISF,
                    SUM(CASE WHEN satisfaccion_cliente = 'satisfecho' THEN 1 ELSE 0 END) as USUARIOS_NS_SATISFECHO,
                    SUM(CASE WHEN satisfaccion_cliente = 'muy_satisfecho' THEN 1 ELSE 0 END) as USUARIOS_NS_MUY_SATISFECHO
                FROM pqr
                WHERE YEAR(fecha_recepcion) = ?
                    AND QUARTER(fecha_recepcion) = ?
                    AND satisfaccion_cliente IS NOT NULL
                GROUP BY MONTH(fecha_recepcion), medio_recepcion
                ORDER BY MES_DEL_TRIMESTRE, ID_MEDIO_ATENCION
            `;

            let datosSatisfaccion = await this.db.query(querySatisfaccion, [anno, trimestre, anno, trimestre]);

            // Si no hay datos de satisfacción, crear estructura vacía
            if (datosSatisfaccion.length === 0) {
                datosSatisfaccion = meses.map(mes => ({
                    ANNO: parseInt(anno),
                    TRIMESTRE: parseInt(trimestre),
                    MES_DEL_TRIMESTRE: mes,
                    ID_MEDIO_ATENCION: 1,
                    USUARIOS_NS_MUY_INSATISFECHO: 0,
                    USUARIOS_NS_INSATISFECHO: 0,
                    USUAR_NS_NI_INSATISF_NI_SATISF: 0,
                    USUARIOS_NS_SATISFECHO: 0,
                    USUARIOS_NS_MUY_SATISFECHO: 0
                }));
            }
            
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

    // Reporte de Facturación para Siigo (Modelo de importación)
    async generarReporteSiigoFacturacion(req, res) {
        try {
            const { fechaInicio, fechaFin } = req.query;

            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({ error: 'Fecha inicio y fecha fin son requeridas' });
            }

            // Obtener NIT de la empresa desde configuración
            const [configEmpresa] = await this.db.query('SELECT empresa_nit FROM configuracion_empresa LIMIT 1');
            const nitEmpresa = configEmpresa[0]?.empresa_nit || '';

            const query = `
                SELECT
                    f.numero_factura as 'Tipo de comprobante',
                    f.numero_factura as 'Consecutivo',
                    c.identificacion as 'Identificación tercero',
                    CASE
                        WHEN ci.nombre LIKE '%Campoalegre%' THEN '3'
                        WHEN ci.nombre LIKE '%Piedecuesta%' THEN '4'
                        WHEN ci.nombre LIKE '%San Gil%' THEN '1'
                        WHEN ci.nombre LIKE '%Socorro%' THEN '2'
                        ELSE ''
                    END as 'Sucursal',
                    '' as 'Código centro/subcentro de costos',
                    DATE_FORMAT(f.fecha_emision, '%Y-%m-%d') as 'Fecha de elaboración',
                    'COP' as 'Sigla Moneda',
                    1 as 'Tasa de cambio',
                    c.nombre as 'Nombre contacto',
                    c.correo as 'Email Contacto',
                    '' as 'Orden de compra',
                    '' as 'Orden de entrega',
                    '' as 'Fecha orden de entrega',
                    COALESCE(ps.codigo, cf.codigo, '') as 'Código producto',
                    COALESCE(df.descripcion, cf.nombre, ps.nombre, '') as 'Descripción producto',
                    ? as 'Identificación vendedor',
                    '' as 'Código de Bodega',
                    1 as 'Cantidad producto',
                    df.precio_unitario as 'Valor unitario',
                    COALESCE(df.descuento, 0) as 'Valor Descuento',
                    0 as 'Base AIU',
                    '' as 'Identificación ingreso para terceros',
                    CASE
                        WHEN df.iva > 0 THEN '1'
                        ELSE ''
                    END as 'Código impuesto cargo',
                    '' as 'Código impuesto cargo dos',
                    '' as 'Código impuesto retención',
                    '' as 'Código ReteICA',
                    '' as 'Código ReteIVA',
                    '2' as 'Código forma de pago',
                    (df.precio_unitario - COALESCE(df.descuento, 0) + COALESCE(df.iva, 0)) as 'Valor Forma de Pago',
                    DATE_FORMAT(f.fecha_vencimiento, '%Y-%m-%d') as 'Fecha Vencimiento',
                    CONCAT(
                        'Periodo facturado del ',
                        DATE_FORMAT(f.fecha_emision, '%d-%m-%Y'),
                        ' al ',
                        DATE_FORMAT(LAST_DAY(f.fecha_emision), '%d-%m-%Y'),
                        '. Pague antes del ',
                        DATE_FORMAT(f.fecha_vencimiento, '%d de %M de %Y'),
                        ' y Evite Suspensión del Servicio'
                    ) as 'Observaciones'
                FROM facturas f
                JOIN clientes c ON f.cliente_id = c.id
                LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
                JOIN detalle_facturas df ON f.id = df.factura_id
                LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
                LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
                LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
                WHERE f.fecha_emision BETWEEN ? AND ?
                    AND f.estado IN ('pagada', 'pendiente', 'vencida')
                ORDER BY f.fecha_emision, f.numero_factura, df.id
            `;

            const datos = await this.db.query(query, [nitEmpresa, fechaInicio, fechaFin]);

            if (datos.length === 0) {
                return res.status(404).json({
                    error: 'No se encontraron facturas en el rango de fechas especificado'
                });
            }

            // Crear workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datos);

            // Configurar ancho de columnas
            const colWidths = [
                { wch: 20 }, // Tipo de comprobante
                { wch: 15 }, // Consecutivo
                { wch: 20 }, // Identificación tercero
                { wch: 10 }, // Sucursal
                { wch: 30 }, // Código centro/subcentro de costos
                { wch: 18 }, // Fecha de elaboración
                { wch: 12 }, // Sigla Moneda
                { wch: 15 }, // Tasa de cambio
                { wch: 25 }, // Nombre contacto
                { wch: 30 }, // Email Contacto
                { wch: 18 }, // Orden de compra
                { wch: 18 }, // Orden de entrega
                { wch: 20 }, // Fecha orden de entrega
                { wch: 18 }, // Código producto
                { wch: 40 }, // Descripción producto
                { wch: 20 }, // Identificación vendedor
                { wch: 18 }, // Código de Bodega
                { wch: 18 }, // Cantidad producto
                { wch: 15 }, // Valor unitario
                { wch: 18 }, // Valor Descuento
                { wch: 12 }, // Base AIU
                { wch: 30 }, // Identificación ingreso para terceros
                { wch: 25 }, // Código impuesto cargo
                { wch: 25 }, // Código impuesto cargo dos
                { wch: 25 }, // Código impuesto retención
                { wch: 18 }, // Código ReteICA
                { wch: 18 }, // Código ReteIVA
                { wch: 20 }, // Código forma de pago
                { wch: 20 }, // Valor Forma de Pago
                { wch: 18 }, // Fecha Vencimiento
                { wch: 80 }  // Observaciones
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Facturas_Siigo");

            // Generar buffer del archivo
            const buffer = XLSX.write(wb, {
                type: 'buffer',
                bookType: 'xlsx',
                compression: true
            });

            // Configurar headers de respuesta
            const filename = `Facturacion_Siigo_${fechaInicio}_${fechaFin}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'no-cache');

            // Enviar archivo
            res.send(buffer);

        } catch (error) {
            console.error('Error generando reporte Siigo facturación:', error);
            res.status(500).json({
                error: 'Error generando reporte de facturación Siigo',
                details: error.message
            });
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
                },
                {
                    id: 'siigo_facturacion',
                    nombre: 'Facturación Siigo (Modelo de importación)',
                    descripcion: 'Reporte para importación de facturas en Siigo',
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