# Manual de Facturación Automática y Gestión de Clientes

## 📋 Índice

1. [Cambios Implementados](#cambios-implementados)
2. [Clientes con Múltiples Ubicaciones](#clientes-con-múltiples-ubicaciones)
3. [Proceso de Facturación Automática](#proceso-de-facturación-automática)
4. [Reglas de IVA](#reglas-de-iva)
5. [Creación Automática de Documentos](#creación-automática-de-documentos)
6. [Conceptos de Facturación](#conceptos-de-facturación)

---

## 🔧 Cambios Implementados

### 1. Clientes con Múltiples Ubicaciones

**Problema resuelto:** El sistema no permitía crear un cliente con la misma identificación (cédula/NIT) en diferentes direcciones o ciudades.

**Solución:**
- ✅ Eliminado el constraint UNIQUE de la columna `identificacion` en la tabla `clientes`
- ✅ Ahora es posible registrar el mismo cliente (mismo documento) en diferentes direcciones
- ✅ Cada ubicación puede tener sus propios servicios, contratos y facturas independientes

**Ejemplo de uso:**
```
Cliente: Juan Pérez (CC 1005450340)

  Ubicación 1:
  - Dirección: Calle 32 #11-13, Pereira
  - Servicios: Internet 100 Mbps
  - Contrato: CON-2025-000001

  Ubicación 2:
  - Dirección: Carrera 10 #50-20, Dosquebradas
  - Servicios: TV + Internet
  - Contrato: CON-2025-000002
```

**Implementación:**
- Archivo de migración: `/backend/migrations/001_permitir_clientes_multiples_direcciones.sql`
- Script de ejecución: `/backend/migrations/ejecutar_migracion.js`
- Servicio modificado: `/backend/services/AlertasClienteService.js`

### 2. Mejoras en AlertasClienteService

El servicio ahora:
- ✅ Muestra TODAS las ubicaciones de un cliente
- ✅ Agrupa servicios, facturas y contratos por ubicación
- ✅ Presenta totales consolidados
- ✅ Genera alertas contextuales considerando todas las ubicaciones

---

## 👥 Clientes con Múltiples Ubicaciones

### Cómo crear un cliente en una nueva ubicación

1. **Ingresar los datos del cliente** con el mismo documento pero diferente dirección/ciudad
2. **El sistema mostrará** todas las ubicaciones existentes del cliente
3. **Podrá elegir:**
   - Agregar servicios a una ubicación existente
   - Crear un nuevo registro en una dirección diferente

### Ventajas del nuevo sistema

- ✅ Un cliente puede tener servicios en múltiples ciudades
- ✅ Cada ubicación tiene su propia facturación independiente
- ✅ Contratos y órdenes de instalación por ubicación
- ✅ Seguimiento individual de pagos y mora por ubicación
- ✅ Facilita la gestión de clientes con negocios o propiedades en diferentes lugares

---

## 📊 Proceso de Facturación Automática

### Periodos de Facturación

El sistema maneja **facturación mensual del 1 al 30 de cada mes**, con un proceso de nivelación para nuevos clientes:

### Primera Factura (Factura inicial)

**Regla:** Se cobra desde el día de ingreso hasta 30 días después.

**Ejemplo:**
```
Cliente: Carlos Pérez
Fecha de ingreso: 27 de junio

Primera factura:
- Periodo: 27 junio → 26 julio (30 días)
- Valor: Precio completo del plan
- Cobro: 1 mes de servicio
```

### Segunda Factura (Nivelación)

**Regla:** Se toma el día siguiente a la primera factura, se suman 30 días más, y luego se extiende hasta el último día del mes para nivelar.

**Ejemplo:**
```
Cliente: Carlos Pérez (continuación)

Segunda factura:
- Desde: 27 julio (día siguiente a primera factura)
- 30 días después: 26 agosto
- Hasta: 31 agosto (fin de mes para nivelar)
- Total: 36 días (1 mes + 5 días de nivelación)
- Cobro: Prorrateado por 36 días
```

**Cálculo del prorratea:**
```
Precio del plan: $50,000
Días facturados: 36 días
Precio por día: $50,000 / 30 = $1,667
Total a cobrar: $1,667 × 36 = $60,012
```

### Tercera Factura en Adelante (Facturación estándar)

**Regla:** Del día 1 al último día del mes completo.

**Ejemplo:**
```
Cliente: Carlos Pérez (continuación)

Tercera factura:
- Periodo: 1 septiembre → 30 septiembre (30 días)
- Valor: Precio completo del plan
- Cobro: 1 mes de servicio

Cuarta factura:
- Periodo: 1 octubre → 31 octubre (31 días)
- Valor: Precio completo del plan
- Cobro: 1 mes de servicio
```

### Implementación Técnica

**Archivo:** `/backend/services/FacturacionAutomaticaService.js`

**Métodos principales:**
- `generarFacturacionMensual()` - Procesa todos los clientes activos
- `calcularPeriodoFacturacion()` - Determina el periodo correcto según número de facturas
- `calcularConceptosFacturacion()` - Calcula valores y prorratea si es necesario

---

## 💰 Reglas de IVA

### Internet

| Estrato | IVA | Porcentaje |
|---------|-----|------------|
| 1, 2, 3 | ❌ NO | 0% |
| 4, 5, 6 | ✅ SÍ | 19% |

### Televisión

| Estrato | IVA | Porcentaje |
|---------|-----|------------|
| Todos | ✅ SÍ | 19% |

### Otros Conceptos

| Concepto | IVA | Porcentaje |
|----------|-----|------------|
| Reconexión | ✅ SÍ | 19% |
| Varios | ✅ SÍ | 19% |
| Instalación | ✅ SÍ | 19% |
| Publicidad | ❌ NO | 0% |
| Intereses | ❌ NO | 0% |
| Descuentos | ❌ NO | 0% |

### Ejemplo de Cálculo

**Cliente estrato 2 con Internet:**
```
Plan: Internet 50 Mbps - $40,000
Estrato: 2
IVA: NO aplica (estratos 1, 2, 3 sin IVA en Internet)

Factura:
- Subtotal: $40,000
- IVA: $0
- Total: $40,000
```

**Cliente estrato 4 con Internet + TV:**
```
Internet 100 Mbps: $50,000
Televisión Básica: $35,000
Estrato: 4

Cálculo:
Internet:
  - Base: $50,000
  - IVA (19%): $9,500
  - Total Internet: $59,500

Televisión:
  - Base: $35,000
  - IVA (19%): $6,650
  - Total TV: $41,650

Factura:
- Subtotal: $85,000
- IVA: $16,150
- Total: $101,150
```

### Implementación Técnica

**Archivo:** `/backend/services/IVACalculatorService.js`

**Método principal:**
- `determinarIVA(tipoServicio, estrato)` - Determina si aplica IVA y el porcentaje
- `calcularPrecioConIVA(precioBase, tipoServicio, estrato)` - Calcula el precio con IVA

---

## 📄 Creación Automática de Documentos

### Al Registrar un Cliente

Cuando se ingresa un nuevo cliente al sistema, se generan automáticamente:

1. **✅ Contrato**
   - Número consecutivo automático
   - Tipo de permanencia (con/sin)
   - Costo de instalación según permanencia
   - Fecha de vencimiento de permanencia

2. **✅ Orden de Instalación**
   - Programada para el día siguiente
   - Dirección de instalación
   - Datos de contacto

3. **✅ Primera Factura**
   - Periodo de 30 días desde la fecha de ingreso
   - Conceptos: Servicio + Instalación
   - IVA calculado según estrato y tipo de servicio
   - Fecha de vencimiento: 15 días después de emisión

### Costos de Instalación

| Tipo de Contrato | Costo de Instalación |
|------------------|---------------------|
| **Con permanencia** (6 meses mínimo) | $42,016 + IVA = **$50,000** |
| **Sin permanencia** | $126,048 + IVA = **$150,000** |

### Ejemplo Completo

```
Cliente nuevo:
- Nombre: María García
- Fecha ingreso: 15 marzo 2025
- Plan: Internet 50 Mbps ($40,000)
- Estrato: 3
- Tipo contrato: Con permanencia

Documentos generados:

1. Contrato: CON-2025-000123
   - Permanencia: 6 meses
   - Fecha vencimiento: 15 septiembre 2025
   - Costo instalación: $50,000

2. Orden de Instalación: ORD-2025-000456
   - Fecha programada: 16 marzo 2025
   - Dirección: Calle 10 #20-30

3. Primera Factura: FAC-000789
   - Periodo: 15 marzo → 14 abril (30 días)
   - Conceptos:
     * Internet 50 Mbps: $40,000 (Sin IVA - Estrato 3)
     * Instalación: $42,016
     * IVA sobre instalación: $7,984
   - Total: $90,000
   - Vencimiento: 30 marzo 2025
```

### Implementación Técnica

**Archivo:** `/backend/services/ClienteCompletoService.js`

**Método principal:**
- `crearClienteCompleto(datosCompletos)` - Crea todo en una sola transacción

**Ventajas:**
- ✅ Todo o nada (transacción atómica)
- ✅ Números consecutivos garantizados
- ✅ Sin duplicados
- ✅ Trazabilidad completa

---

## 💳 Conceptos de Facturación

### Conceptos Regulares (Cada Mes)

1. **Internet**
   - Precio del plan contratado
   - IVA según estrato

2. **Televisión**
   - Precio del plan contratado
   - Siempre con IVA 19%

### Conceptos Adicionales

3. **Saldo Anterior**
   - Deuda pendiente de facturas anteriores
   - Sin IVA

4. **Intereses de Mora**
   - Calculados sobre facturas vencidas
   - Sin IVA

5. **Reconexión del Servicio**
   - Cuando se suspende y reactiva el servicio
   - Con IVA 19%

6. **Varios**
   - Concepto flexible para cobros adicionales
   - Con IVA 19%
   - Ejemplos:
     * Abono por financiación
     * Cobro por no entrega de equipos
     * Cobro por traslado de servicio

7. **Descuentos**
   - Valor negativo que reduce el total
   - Sin IVA
   - Se usa para:
     * Ajustes por tiempos de servicio
     * Correcciones de valores facturados incorrectamente
     * Negociaciones con clientes en mora

### Manejo de Varios y Descuentos

#### Opción 1: Modificación Manual

En el módulo de facturas, editar directamente el valor:
- Ir a la factura
- Editar el concepto "Varios" o "Descuentos"
- Ingresar el valor
- Guardar

#### Opción 2: Registro para Periodos Futuros

Usar el botón "Varios Pendientes":
- Ir al módulo de cliente
- Clic en "Registrar Varios"
- Seleccionar concepto
- Ingresar valor y cantidad de meses
- El sistema lo aplicará automáticamente en las próximas facturas

### Cuándo Facturar Varios

**Siempre con IVA 19%:**

1. **Inicio de contrato:** Instalación ($42,016 + IVA)
2. **No entrega de equipo:** Valor del equipo + IVA
3. **Traslado de servicio:** Costo del traslado + IVA
4. **Abono por financiación:** Monto acordado + IVA

### Cuándo Aplicar Descuentos

**Sin IVA:**

1. **Cliente con mora > 3 meses:** Negociación de saldo
2. **Error en facturación:** Corrección de valores
3. **Ajuste por suspensión:** Días sin servicio

### Ejemplo de Factura Completa

```
Factura: FAC-001234
Cliente: Pedro López
Periodo: 1 octubre → 31 octubre 2025
Estrato: 4

CONCEPTOS:
-----------------------------------------
Internet 100 Mbps        $50,000
IVA Internet (19%)       $ 9,500
-----------------------------------------
Televisión Básica        $35,000
IVA Televisión (19%)     $ 6,650
-----------------------------------------
Saldo Anterior           $45,000
Intereses de Mora        $ 4,500
-----------------------------------------
Reconexión               $40,000
IVA Reconexión (19%)     $ 7,600
-----------------------------------------
Varios (Traslado)        $30,000
IVA Varios (19%)         $ 5,700
-----------------------------------------
Descuento (Negociación)  -$20,000
-----------------------------------------

SUBTOTAL:               $204,500
IVA TOTAL:              $ 29,450
TOTAL A PAGAR:          $213,950

Fecha de vencimiento: 16 octubre 2025
```

---

## 🔄 Proceso de Facturación Mensual

### Ejecución Manual

```javascript
// Desde el backend o consola
const FacturacionAutomaticaService = require('./services/FacturacionAutomaticaService');

const resultado = await FacturacionAutomaticaService.generarFacturacionMensual({
  periodo: '2025-10', // Opcional, por defecto usa el mes actual
  forzar: false       // Opcional, no genera si ya existen facturas del período
});

console.log(resultado);
// {
//   periodo: '2025-10',
//   fecha_proceso: '2025-10-01T10:30:00.000Z',
//   clientes_procesados: 150,
//   facturas_generadas: 145,
//   errores: 5,
//   tasa_exito: '96.67%',
//   detalles: [...]
// }
```

### Validaciones Antes de Facturar

El sistema valida:
- ✅ Cliente en estado 'activo'
- ✅ Al menos un servicio activo
- ✅ No existe factura para el período actual
- ✅ Tiene historial completo de facturas (sin saltos)

### Estados de Factura

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Factura generada, esperando pago |
| `pagada` | Factura pagada completamente |
| `vencida` | Factura con fecha de vencimiento superada |
| `anulada` | Factura anulada (no se considera en cálculos) |

---

## 🔍 Consultas Útiles

### Ver todas las ubicaciones de un cliente

```sql
SELECT
  c.id,
  c.identificacion,
  c.nombre,
  c.direccion,
  c.barrio,
  ciu.nombre as ciudad,
  dep.nombre as departamento,
  s.nombre as sector,
  c.estado,
  COUNT(DISTINCT sc.id) as servicios_activos
FROM clientes c
LEFT JOIN ciudades ciu ON c.ciudad_id = ciu.id
LEFT JOIN departamentos dep ON ciu.departamento_id = dep.id
LEFT JOIN sectores s ON c.sector_id = s.id
LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
WHERE c.identificacion = '1005450340'
GROUP BY c.id
ORDER BY c.created_at DESC;
```

### Ver historial de facturación de un cliente

```sql
SELECT
  f.numero_factura,
  f.periodo_facturacion,
  f.fecha_desde,
  f.fecha_hasta,
  DATEDIFF(f.fecha_hasta, f.fecha_desde) + 1 as dias_facturados,
  f.subtotal,
  f.iva,
  f.total,
  f.estado,
  f.fecha_emision,
  f.fecha_vencimiento
FROM facturas f
WHERE f.cliente_id = 16  -- ID del cliente
ORDER BY f.fecha_emision ASC;
```

---

## 🚀 Migración de Base de Datos

### Ejecutar Migración

Para habilitar clientes con múltiples ubicaciones:

```bash
cd /home/user/ERP-PSI/backend

# Ejecutar migración
node migrations/ejecutar_migracion.js
```

**La migración:**
- ✅ Elimina el constraint UNIQUE de `identificacion`
- ✅ Mantiene índices para búsquedas rápidas
- ✅ Crea índices compuestos para optimizar consultas
- ✅ Es reversible en caso de problemas

---

## 📞 Soporte

Para más información o problemas, contactar al equipo de desarrollo.

**Archivos modificados:**
- `/backend/migrations/001_permitir_clientes_multiples_direcciones.sql`
- `/backend/services/AlertasClienteService.js`
- `/backend/services/FacturacionAutomaticaService.js`
- `/backend/services/IVACalculatorService.js`
- `/backend/controllers/clienteController.js`

---

**Versión:** 1.0
**Fecha:** 14 de noviembre de 2025
**Autor:** Claude - Antropic
