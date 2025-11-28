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

    // ✅ CORRECCIÓN: Crear MÚLTIPLES SEDES para soportar 3+ servicios
    console.log(`📦 Procesando ${planesSeleccionados.length} plan(es) - Creando múltiples sedes si es necesario`);

    const servicios = [];
    
    // Crear una sede por cada PAR de servicios (máximo 2 por sede debido a limitación del sistema)
    for (let i = 0; i < planesSeleccionados.length; i += 2) {
      const planId1 = parseInt(planesSeleccionados[i]);
      const planId2 = planesSeleccionados[i + 1] ? parseInt(planesSeleccionados[i + 1]) : null;

      // Obtener información de los planes
      const [plan1Info] = await connection.query(
        'SELECT id, nombre, tipo FROM planes_servicio WHERE id = ?',
        [planId1]
      );

      let plan2Info = null;
      if (planId2) {
        [plan2Info] = await connection.query(
          'SELECT id, nombre, tipo FROM planes_servicio WHERE id = ?',
          [planId2]
        );
      }

      const sedeConfig = {
        id: Date.now() + i,
        nombre_sede: i === 0 ? 'Sede Principal' : `Servicio Adicional ${Math.floor(i / 2) + 1}`,
        direccion_servicio: direccion,
        contacto_sede: `${nombres} ${apellidos}`.trim(),
        telefono_sede: celular,
        precioPersonalizado: false,
        tipoContrato: tipoPermanencia || 'sin_permanencia',
        mesesPermanencia: tipoPermanencia === 'con_permanencia' ? 6 : 0,
        fechaActivacion: new Date().toISOString().split('T')[0],
        observaciones: `Registro web - Grupo ${Math.floor(i / 2) + 1}`
      };

      // Asignar primer plan
      if (plan1Info && plan1Info.length > 0) {
        const tipo1 = (plan1Info[0].tipo || '').toLowerCase();
        if (tipo1.includes('internet') || tipo1.includes('combo')) {
          sedeConfig.planInternetId = planId1;
        } else if (tipo1.includes('tv') || tipo1.includes('television')) {
          sedeConfig.planTelevisionId = planId1;
        } else {
          sedeConfig.planInternetId = planId1; // Por defecto a internet
        }
        console.log(`  ✅ Plan ${plan1Info[0].id}: ${plan1Info[0].nombre} (${plan1Info[0].tipo})`);
      }

      // Asignar segundo plan si existe
      if (plan2Info && plan2Info.length > 0) {
        const tipo2 = (plan2Info[0].tipo || '').toLowerCase();
        if (tipo2.includes('tv') || tipo2.includes('television')) {
          sedeConfig.planTelevisionId = planId2;
        } else if (!sedeConfig.planInternetId) {
          sedeConfig.planInternetId = planId2;
        } else {
          sedeConfig.planTelevisionId = planId2;
        }
        console.log(`  ✅ Plan ${plan2Info[0].id}: ${plan2Info[0].nombre} (${plan2Info[0].tipo})`);
      }

      servicios.push(sedeConfig);
      console.log(`📍 Sede ${servicios.length}: Internet=${sedeConfig.planInternetId || 'N/A'}, TV=${sedeConfig.planTelevisionId || 'N/A'}`);
    }

    connection.release();

    console.log(`📦 Total de sedes/servicios a crear: ${servicios.length}`);

    // USAR EL MISMO SERVICE QUE USA EL ADMIN
    const ClienteCompletoService = require('../services/ClienteCompletoService');

    // FORMATO para el servicio
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
      servicios: servicios, // ✅ MÚLTIPLES SEDES
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
      sedes: servicios.length,
      servicios: resultado?.resumen?.total_servicios || 0,
      contratos: resultado?.resumen?.total_contratos || 0
    });

    return res.status(201).json({
      success: true,
      clienteId: resultado?.cliente_id,
      message: servicios.length > 1 
        ? `¡Registro exitoso! Se crearon ${servicios.length} grupos de servicios.`
        : '¡Registro exitoso! Pronto nos pondremos en contacto contigo.',
      data: {
        cliente_id: resultado?.cliente_id,
        numero_documento: numeroDocumento,
        nombre_completo: `${nombres} ${apellidos}`,
        email: email,
        sedes_creadas: resultado?.sedes_creadas?.length || 0,
        contratos_generados: resultado?.resumen?.total_contratos || 0,
        facturas_generadas: resultado?.resumen?.total_facturas || 0,
        servicios_contratados: resultado?.resumen?.total_servicios || 0,
        instalacion_programada: (resultado?.resumen?.total_instalaciones || 0) > 0,
        grupos_servicios: servicios.length
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