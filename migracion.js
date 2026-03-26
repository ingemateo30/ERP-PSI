const fs = require('fs');
const readline = require('readline');

const archivoEntrada = 'campoalegre.sql';
const archivoSalida = 'datos_desde_12_dic.sql';
const fechaCorte = '2025-12-12';

// Mapa exacto de en qué posición (índice) está la columna de FECHA en cada tabla
// Nota: En programación empezamos a contar desde el 0.
const indiceFechas = {
    'USUARIOS': 4,               // FECHA de creación del cliente
    'FACTURACION_NUEVA': 18,     // FECHA_FACTURACION
    'FACTURACION_NUEVA_3': 18,   // FECHA_FACTURACION
    'MANTENIMIENTO': 7,          // FECHA del mantenimiento
    'INACTIVOS': 5,              // FECHA de inactivación
    'SUSPENSION': 1,             // FECHA de suspensión
    'DESCUENTOS_USUARIOS': 4,    // FECHA del descuento
    'VARIOS_USUARIOS': 4,        // FECHA 
    'FACTURACION_MODI': 20       // FECHA en facturación modificada
};

async function procesarArchivo() {
    console.log(`[Iniciando] Extrayendo TODAS las transacciones y clientes desde ${fechaCorte}...`);
    
    const outStream = fs.createWriteStream(archivoSalida, { encoding: 'utf8' });
    outStream.write("START TRANSACTION;\nSET FOREIGN_KEY_CHECKS = 0;\n\n");

    const rl = readline.createInterface({
        input: fs.createReadStream(archivoEntrada, { encoding: 'latin1' }),
        crlfDelay: Infinity
    });

    let contadores = {};

    for await (const line of rl) {
        if (!line.toUpperCase().startsWith('INSERT INTO ')) continue;

        // Identificar de qué tabla es este registro
        const tablaMatch = line.match(/INSERT INTO\s+([A-Z0-9_]+)/i);
        if (!tablaMatch) continue;
        const tabla = tablaMatch[1].toUpperCase();

        // Si la tabla no tiene una columna de fecha conocida en nuestro mapa, la ignoramos
        if (indiceFechas[tabla] === undefined) continue;

        // Extraer los valores
        const matchValues = line.match(/VALUES\s*\((.*)\);/i);
        if (!matchValues) continue;

        let values = matchValues[1].match(/'(?:[^']|"")*'|[^,]+/g);
        if (!values) continue;

        values = values.map(v => v.trim().replace(/^'|'$/g, ''));

        // Obtener la fecha según la tabla que estemos leyendo
        const indice = indiceFechas[tabla];
        const fechaRegistro = values[indice];

        // MÁGIA AQUÍ: Si la fecha del registro es >= 12 de Dic, lo guardamos
        if (fechaRegistro && fechaRegistro >= fechaCorte) {
            
            contadores[tabla] = (contadores[tabla] || 0) + 1;

            // Si es un cliente nuevo, lo adaptamos al formato de base_psi
            if (tabla === 'USUARIOS') {
                const ident = values[0];
                const nombre = values[1].replace(/'/g, "\\'");
                const direcc = values[2].replace(/'/g, "\\'");
                const estra = values[3];
                const barrio = values[5].replace(/'/g, "\\'");
                const desc = values[6].replace(/'/g, "\\'");
                let est_my = values[9] === 'S' ? 'suspendido' : (values[9] === 'I' ? 'inactivo' : 'activo');
                const correo = values[13] || '';
                const tel = values[14] || '';
                const mac = values[16] || '';
                const ip = values[17] || '';
                const tap = values[18] || '';
                const poste = values[19] || '';

                const sqlCliente = `INSERT IGNORE INTO clientes (identificacion, tipo_documento, nombre, direccion, estrato, barrio, ciudad_id, telefono, correo, fecha_registro, estado, mac_address, ip_asignada, tap, poste, observaciones, created_at) VALUES ('${ident}', 'cedula', '${nombre}', '${direcc}', '${estra}', '${barrio}', 9, '${tel}', '${correo}', '${fechaRegistro}', '${est_my}', '${mac}', '${ip}', '${tap}', '${poste}', '${desc}', '${fechaRegistro} 00:00:00');\n`;
                outStream.write(sqlCliente);
            } 
            // Si es cualquier otra cosa (Factura, mantenimiento, etc), lo guardamos tal cual
            else {
                const safeValues = values.map(v => {
                    if (v === 'NULL') return 'NULL';
                    return `'${v.replace(/'/g, "\\'")}'`;
                }).join(', ');

                outStream.write(`INSERT IGNORE INTO ${tabla.toLowerCase()} VALUES (${safeValues});\n`);
            }
        }
    }

    outStream.write("\nSET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n");
    
    console.log(`\n¡Extracción exitosa! Archivo guardado como: ${archivoSalida}`);
    console.log("Resumen de registros extraídos:");
    console.table(contadores);
}

procesarArchivo().catch(console.error);