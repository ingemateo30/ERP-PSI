const db = require('../config/database');
const { validationResult } = require('express-validator');

const registroWebController = {
  // 📦 Obtener planes activos
  obtenerPlanes: async (req, res) => {
    try {
      const connection = await db.getConnection();
      const [planes] = await connection.query(`
        SELECT
          id,
          codigo,
          nombre,
          tipo,
          precio,
          velocidad_subida,
          velocidad_bajada,
          canales_tv,
          descripcion,
          tecnologia,
          segmento,
          precio_internet,
          precio_television,
          aplica_iva,
          costo_instalacion_sin_permanencia as costo_instalacion
        FROM planes_servicio
        WHERE activo = 1
        ORDER BY orden_visualizacion ASC, precio ASC
      `);
      connection.release();
      res.json({
        success: true,
        data: planes
      });
    } catch (error) {
      console.error('❌ Error obteniendo planes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener planes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 🏙️ Obtener ciudades
  obtenerCiudades: async (req, res) => {
    try {
      const connection = await db.getConnection();
      const [ciudades] = await connection.query(`
        SELECT
          c.id,
          c.nombre,
          c.codigo,
          d.nombre as departamento
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        ORDER BY c.nombre ASC
      `);
      connection.release();
      res.json({
        success: true,
        data: ciudades
      });
    } catch (error) {
      console.error('❌ Error obteniendo ciudades:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ciudades',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 🗺️ Obtener sectores por ciudad
  obtenerSectores: async (req, res) => {
    try {
      const { ciudadId } = req.params;
      const connection = await db.getConnection();
      const [sectores] = await connection.query(`
        SELECT
          id,
          codigo,
          nombre,
          ciudad_id
        FROM sectores
        WHERE ciudad_id = ? AND activo = 1
        ORDER BY nombre ASC
      `, [ciudadId]);
      connection.release();
      res.json({
        success: true,
        data: sectores
      });
    } catch (error) {
      console.error('❌ Error obteniendo sectores:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener sectores',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

// 📝 Registrar cliente
// 📝 Registrar cliente
registrarCliente: async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Errores de validación:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const {
      tipoDocumento, numeroDocumento, nombres, apellidos,
      email, celular, direccion, barrio,
      planesSeleccionados, aceptaTerminos, aceptaTratamientoDatos,
      ciudadId, sectorId, tipoPermanencia, estrato
    } = req.body;

    console.log('📋 Registro web iniciado:', {
      documento: numeroDocumento,
      nombre: `${nombres} ${apellidos}`,
      email: email,
      planes: planesSeleccionados,
      cantidad_planes: planesSeleccionados.length
    });

    // Verificar duplicado
    const connection = await db.getConnection();
    const [existe] = await connection.query(
      'SELECT id, nombre FROM clientes WHERE identificacion = ?',
      [numeroDocumento]
    );

    if (existe.length > 0) {
      connection.release();
      console.warn('⚠️ Cliente ya existe:', existe[0].nombre);
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente registrado con este número de documento'
      });
    }

    // MAPEO DE TIPOS DE DOCUMENTO
    const tipoDocumentoMap = {
      'CC': 'cedula',
      'NIT': 'nit',
      'CE': 'extranjeria',
      'TI': 'tarjeta_identidad',
      'PASAPORTE': 'pasaporte'
    };

    // ✅ SOLUCIÓN: Crear UNA SOLA sede con array de planesAdicionales
    console.log(`📦 Procesando ${planesSeleccionados.length} plan(es) en UNA sola sede`);

    // Obtener información de TODOS los planes
    const planesInfo = [];
    for (const planId of planesSeleccionados) {
      const [plan] = await connection.query(
        'SELECT id, nombre, tipo, precio FROM planes_servicio WHERE id = ?',
        [parseInt(planId)]
      );
      
      if (plan.length > 0) {
        planesInfo.push(plan[0]);
        console.log(`  ✅ Plan ${plan[0].id}: ${plan[0].nombre} (${plan[0].tipo}) - $${plan[0].precio}`);
      }
    }

    connection.release();

    // Crear configuración de sede única con TODOS los planes
    const sedeConfig = {
      id: Date.now(),
      nombre_sede: 'Sede Principal',
      direccion_servicio: direccion,
      contacto_sede: `${nombres} ${apellidos}`.trim(),
      telefono_sede: celular,
      precioPersonalizado: false,
      tipoContrato: tipoPermanencia || 'sin_permanencia',
      mesesPermanencia: tipoPermanencia === 'con_permanencia' ? 6 : 0,
      fechaActivacion: new Date().toISOString().split('T')[0],
      observaciones: `Registro web - ${planesSeleccionados.length} servicios`,
      // ✅ CRÍTICO: Enviar TODOS los planes como array
      planesAdicionales: planesSeleccionados.map(id => parseInt(id))
    };

    // Asignar primeros 2 planes a campos específicos (compatibilidad)
    if (planesInfo.length > 0) {
      const tipo0 = (planesInfo[0].tipo || '').toLowerCase();
      if (tipo0.includes('internet') || tipo0.includes('combo')) {
        sedeConfig.planInternetId = planesInfo[0].id;
      } else if (tipo0.includes('tv') || tipo0.includes('television')) {
        sedeConfig.planTelevisionId = planesInfo[0].id;
      } else {
        sedeConfig.planInternetId = planesInfo[0].id;
      }
    }

    if (planesInfo.length > 1) {
      const tipo1 = (planesInfo[1].tipo || '').toLowerCase();
      if (tipo1.includes('tv') || tipo1.includes('television')) {
        sedeConfig.planTelevisionId = planesInfo[1].id;
      } else if (!sedeConfig.planInternetId) {
        sedeConfig.planInternetId = planesInfo[1].id;
      }
    }

    console.log(`📦 Sede configurada con ${planesSeleccionados.length} plan(es):`, {
      planInternetId: sedeConfig.planInternetId,
      planTelevisionId: sedeConfig.planTelevisionId,
      planesAdicionales: sedeConfig.planesAdicionales
    });

    // USAR EL MISMO SERVICE QUE USA EL ADMIN
    const ClienteCompletoService = require('../services/ClienteCompletoService');

    // FORMATO para el servicio - UNA SOLA SEDE
    const datosCompletos = {
      cliente: {
        identificacion: numeroDocumento,
        tipo_documento: tipoDocumentoMap[tipoDocumento.toUpperCase()] || 'cedula',
        nombre: `${nombres} ${apellidos}`.trim(),
        correo: email,
        telefono: celular,
        telefono_2: '',
        direccion: direccion,
        barrio: barrio,
        estrato: estrato ? parseInt(estrato) : 3,
        ciudad_id: ciudadId ? parseInt(ciudadId) : null,
        sector_id: sectorId ? parseInt(sectorId) : null,
        observaciones: `🌐 REGISTRO WEB
✅ Términos: Sí
✅ Datos: Sí
💳 ${tipoPermanencia === 'con_permanencia' ? 'Con permanencia (6 meses)' : 'Sin permanencia'}
📦 Planes: ${planesSeleccionados.join(', ')}
📅 Fecha: ${new Date().toLocaleString('es-CO')}`,
        fecha_inicio_contrato: new Date().toISOString().split('T')[0]
      },
      servicios: [sedeConfig], // ✅ UNA SOLA SEDE
      opciones: {
        generar_documentos: true,
        enviar_bienvenida: true,
        programar_instalacion: true
      }
    };

    // Llamar al servicio
    const resultado = await ClienteCompletoService.crearClienteConServicios(datosCompletos, 1);

    console.log('✅ Cliente creado:', {
      clienteId: resultado?.cliente_id,
      sedes: 1,
      servicios: resultado?.resumen?.total_servicios || 0,
      contratos: resultado?.resumen?.total_contratos || 0
    });

    return res.status(201).json({
      success: true,
      clienteId: resultado?.cliente_id,
      message: '¡Registro exitoso! Pronto nos pondremos en contacto contigo.',
      data: {
        cliente_id: resultado?.cliente_id,
        numero_documento: numeroDocumento,
        nombre_completo: `${nombres} ${apellidos}`,
        email: email,
        sedes_creadas: 1,
        contratos_generados: 1,
        facturas_generadas: 1,
        servicios_contratados: planesSeleccionados.length,
        instalacion_programada: true
      }
    });

  } catch (error) {
    console.error('❌ Error en registro web:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el registro',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
};

module.exports = registroWebController;