# 📋 GUÍA DE DATOS DE PRUEBA - SISTEMA DE FACTURACIÓN AUTOMÁTICA

## 📌 Introducción

Esta guía explica los datos de prueba creados para demostrar el funcionamiento completo del sistema de facturación automática del ERP-PSI. Los datos incluyen 5 casos diferentes que cubren todos los escenarios del proceso de facturación.

---

## 🚀 Cómo Cargar los Datos de Prueba

### Opción 1: Usando el Script Node.js (Recomendado)

```bash
cd /home/user/ERP-PSI
node backend/seeds/ejecutar_datos_prueba.js
```

**Requisitos previos:**
- MySQL debe estar corriendo
- Las variables de entorno deben estar configuradas correctamente en `backend/.env`
- Las dependencias de Node.js deben estar instaladas (`npm install`)

### Opción 2: Usando MySQL directamente

```bash
mysql -u root -p erp_psi < backend/seeds/datos_prueba_facturacion.sql
```

O desde dentro de MySQL:

```sql
USE erp_psi;
SOURCE backend/seeds/datos_prueba_facturacion.sql;
```

---

## 📊 CASOS DE PRUEBA INCLUIDOS

Los datos de prueba demuestran el proceso completo de facturación automática según las reglas del sistema.

### 🔷 CASO 1: Carlos Pérez García (TEST001)

**Propósito:** Demostrar el proceso completo de nivelación de facturas

#### Datos del Cliente
- **Identificación:** TEST001
- **Nombre:** Carlos Pérez García
- **Estrato:** 2 (sin IVA en Internet)
- **Servicio:** Internet 30MB ($65,000/mes)
- **Permanencia:** Sí (6 meses)
- **Fecha de inicio:** 27 de Junio 2025

#### Proceso de Facturación

**1️⃣ Primera Factura (FAC-TEST-001-1)**
- **Periodo:** 27 Jun - 26 Jul (30 días)
- **Conceptos:**
  - Internet 30MB: $65,000 (sin IVA - estrato 2)
  - Instalación: $50,000 + IVA 19% = $59,500
- **Total:** $124,500
- **Estado:** Pendiente

📝 *Explicación:* La primera factura cubre exactamente 30 días desde la fecha de activación del servicio.

**2️⃣ Segunda Factura (FAC-TEST-001-2)**
- **Periodo:** 27 Jul - 31 Ago (36 días)
- **Conceptos:**
  - Internet prorrateado: $78,000 (36 días: 30 días normales + 6 días de nivelación)
- **Total:** $78,000
- **Estado:** Pendiente

📝 *Explicación:* La segunda factura incluye 30 días normales MÁS 6 días adicionales para nivelar al final del mes calendario. Esto asegura que a partir de la tercera factura, el cliente facture del 1 al 30 de cada mes.

**Cálculo del prorratea:**
- Precio base: $65,000
- Días facturados: 36
- Cálculo: (65,000 / 30) × 36 = $78,000

**3️⃣ Tercera Factura (FAC-TEST-001-3)**
- **Periodo:** 1 Sep - 30 Sep (30 días - MES COMPLETO)
- **Conceptos:**
  - Internet mes completo: $65,000
- **Total:** $65,000
- **Estado:** Pendiente

📝 *Explicación:* A partir de la tercera factura, el cliente ya está nivelado y factura mes completo del 1 al 30 de cada mes.

#### ✅ Qué demuestra este caso
- ✓ Primera factura con 30 días desde activación
- ✓ Segunda factura con nivelación (36 días)
- ✓ Tercera factura normalizada (mes completo)
- ✓ Aplicación correcta de IVA según estrato
- ✓ Cobro de instalación con permanencia ($50,000)

---

### 🔷 CASO 2: María López Rodríguez (TEST002)

**Propósito:** Demostrar facturación con IVA, múltiples servicios y sin permanencia

#### Datos del Cliente
- **Identificación:** TEST002
- **Nombre:** María López Rodríguez
- **Estrato:** 4 (con IVA 19% en Internet)
- **Servicios:**
  - Internet 50MB ($85,000/mes + IVA)
  - TV Básica ($35,000/mes con IVA incluido)
- **Permanencia:** No
- **Fecha de inicio:** 15 de Julio 2025

#### Proceso de Facturación

**1️⃣ Primera Factura (FAC-TEST-002-1)**
- **Periodo:** 15 Jul - 13 Ago (30 días)
- **Conceptos:**
  - Internet 50MB: $85,000 + IVA 19% = $101,150
  - TV Básica: $35,000 (ya incluye IVA)
  - Instalación sin permanencia: $150,000 + IVA 19% = $178,500
- **Total:** $313,650
- **Estado:** Pendiente

📝 *Explicación:* Al ser estrato 4, el Internet lleva IVA del 19%. La TV siempre lleva IVA. Sin permanencia, la instalación cuesta $150,000.

**2️⃣ Segunda Factura (FAC-TEST-002-2)**
- **Periodo:** 14 Ago - 31 Ago (18 días de nivelación)
- **Conceptos:**
  - Internet prorrateado: $51,000 + IVA = $60,690
  - TV prorrateada: $21,000 (con IVA incluido)
- **Total:** $81,690
- **Estado:** Pendiente

📝 *Explicación:* Como inició el 15 de Julio, su segunda factura solo cubre 18 días para nivelar al fin de mes.

**Cálculos:**
- Internet: (85,000 / 30) × 18 = $51,000 + IVA 19% = $60,690
- TV: (35,000 / 30) × 18 = $21,000

**3️⃣ Tercera Factura (FAC-TEST-002-3)**
- **Periodo:** 1 Sep - 30 Sep (mes completo)
- **Conceptos:**
  - Internet: $85,000 + IVA 19% = $101,150
  - TV: $35,000 (con IVA incluido)
- **Total:** $136,150
- **Estado:** Pendiente

#### ✅ Qué demuestra este caso
- ✓ Aplicación de IVA en estrato 4
- ✓ Facturación de múltiples servicios (Internet + TV)
- ✓ Instalación sin permanencia ($150,000)
- ✓ Proceso de nivelación con múltiples servicios
- ✓ TV siempre con IVA (todos los estratos)

---

### 🔷 CASO 3: Juan Martínez Sánchez (TEST003)

**Propósito:** Demostrar estrato 1 sin IVA y descuentos

#### Datos del Cliente
- **Identificación:** TEST003
- **Nombre:** Juan Martínez Sánchez
- **Estrato:** 1 (sin IVA en Internet)
- **Servicio:** Internet 10MB ($45,000/mes)
- **Permanencia:** Sí (6 meses)
- **Fecha de inicio:** 10 de Agosto 2025

#### Proceso de Facturación

**1️⃣ Primera Factura (FAC-TEST-003-1)**
- **Periodo:** 10 Ago - 8 Sep (30 días)
- **Conceptos:**
  - Internet 10MB: $45,000 (sin IVA - estrato 1)
  - Instalación: $50,000 + IVA 19% = $59,500
  - Descuento promocional: -$5,000
- **Total:** $99,500
- **Estado:** Pendiente

📝 *Explicación:* Estrato 1 no paga IVA en Internet. Se aplicó un descuento promocional de $5,000. El IVA de la instalación sí se cobra.

#### ✅ Qué demuestra este caso
- ✓ Estrato 1 sin IVA en Internet
- ✓ Aplicación de descuentos
- ✓ Instalación con IVA aunque el servicio no lo lleve

---

### 🔷 CASO 4: Empresa ABC Ltda (TEST004)

**Propósito:** Demostrar contrato comercial/empresarial

#### Datos del Cliente
- **Identificación:** TEST004 (NIT)
- **Nombre:** Empresa ABC Ltda
- **Estrato:** 6 (empresarial con IVA)
- **Servicio:** Internet 50MB Empresarial ($120,000/mes + IVA)
- **Permanencia:** Sí (12 meses)
- **Fecha de inicio:** 1 de Septiembre 2025
- **Tipo de contrato:** Comercial

#### Proceso de Facturación

**1️⃣ Primera Factura (FAC-TEST-004-1)**
- **Periodo:** 1 Sep - 30 Sep (30 días - mes completo)
- **Conceptos:**
  - Internet Empresarial 50MB: $120,000 + IVA 19% = $142,800
  - Instalación: $50,000 + IVA 19% = $59,500
- **Total:** $202,300
- **Estado:** Pendiente

📝 *Explicación:* Caso especial: Como inició el día 1 del mes, su primera factura ya es de mes completo. No necesita proceso de nivelación.

#### ✅ Qué demuestra este caso
- ✓ Contrato comercial/empresarial
- ✓ Internet empresarial con IVA
- ✓ Permanencia de 12 meses
- ✓ Inicio en día 1 (mes completo desde el principio)
- ✓ Tipo de documento NIT

---

### 🔷 CASO 5: Ana García Torres (TEST005)

**Propósito:** Demostrar factura vencida, mora, intereses y reconexión

#### Datos del Cliente
- **Identificación:** TEST005
- **Nombre:** Ana García Torres
- **Estrato:** 3 (sin IVA en Internet)
- **Servicio:** Internet 20MB ($55,000/mes)
- **Permanencia:** No
- **Fecha de inicio:** 5 de Julio 2025
- **Estado:** Suspendido (por mora)

#### Proceso de Facturación

**1️⃣ Primera Factura (FAC-TEST-005-1) - VENCIDA**
- **Periodo:** 5 Jul - 3 Ago (30 días)
- **Conceptos:**
  - Internet 20MB: $55,000 (sin IVA - estrato 3)
  - Instalación: $150,000 + IVA 19% = $178,500
- **Total:** $233,500
- **Estado:** VENCIDA ❌

📝 *Explicación:* El cliente no pagó esta factura, por lo que entró en mora y fue suspendido.

**2️⃣ Segunda Factura (FAC-TEST-005-2)**
- **Periodo:** 4 Ago - 31 Ago (28 días)
- **Conceptos:**
  - Saldo anterior: $233,500
  - Intereses por mora (2%): $4,670
  - Reconexión: $10,000 + IVA 19% = $11,900
  - Internet del periodo: $33,000 (18 días prorrateados)
- **Total:** $283,450
- **Estado:** Pendiente

📝 *Explicación:* Esta factura incluye el saldo anterior impago, intereses calculados sobre el saldo vencido, el cargo de reconexión del servicio y el servicio del periodo actual.

**Cálculos:**
- Internet prorrateado: (55,000 / 30) × 18 = $33,000
- Intereses: 233,500 × 2% = $4,670
- Reconexión: $10,000 + IVA 19% = $11,900

#### ✅ Qué demuestra este caso
- ✓ Factura vencida
- ✓ Saldo anterior arrastrado
- ✓ Cálculo de intereses moratorios
- ✓ Cargo de reconexión
- ✓ Cliente suspendido
- ✓ Gestión de cartera vencida

---

## 📈 RESUMEN DE CONCEPTOS DEMOSTRADOS

### Aplicación de IVA
| Estrato | Internet | TV | Instalación | Reconexión | Varios |
|---------|----------|-----|-------------|------------|---------|
| 1, 2, 3 | ❌ Sin IVA | ✅ Con IVA 19% | ✅ Con IVA 19% | ✅ Con IVA 19% | ✅ Con IVA 19% |
| 4, 5, 6 | ✅ Con IVA 19% | ✅ Con IVA 19% | ✅ Con IVA 19% | ✅ Con IVA 19% | ✅ Con IVA 19% |

### Costos de Instalación
| Permanencia | Costo Base | Con IVA 19% | Total |
|-------------|------------|-------------|-------|
| Con permanencia (6+ meses) | $50,000 | $9,500 | $59,500 |
| Sin permanencia | $150,000 | $28,500 | $178,500 |

### Proceso de Nivelación

**Ejemplo: Cliente que inicia el 27 de Junio**

| Factura | Periodo | Días | Observación |
|---------|---------|------|-------------|
| 1ª | 27 Jun - 26 Jul | 30 | Primera factura: 30 días normales |
| 2ª | 27 Jul - 31 Ago | 36 | Segunda factura: 30 + 6 días de nivelación |
| 3ª | 1 Sep - 30 Sep | 30 | Tercera factura: Mes completo (ya nivelado) |
| 4ª+ | 1 Oct - 30 Oct | 30 | Siguientes: Siempre mes completo |

---

## 🔍 CONSULTAS ÚTILES PARA VERIFICAR LOS DATOS

### Ver todos los clientes de prueba

```sql
SELECT
    identificacion,
    nombre,
    estrato,
    fecha_registro,
    estado
FROM clientes
WHERE identificacion LIKE 'TEST%'
ORDER BY identificacion;
```

### Ver todas las facturas creadas

```sql
SELECT
    f.numero_factura,
    c.nombre AS cliente,
    f.fecha_desde,
    f.fecha_hasta,
    DATEDIFF(f.fecha_hasta, f.fecha_desde) + 1 AS dias_facturados,
    f.subtotal,
    f.iva,
    f.total,
    f.estado
FROM facturas f
INNER JOIN clientes c ON f.cliente_id = c.id
WHERE c.identificacion LIKE 'TEST%'
ORDER BY c.identificacion, f.fecha_emision;
```

### Ver resumen por cliente

```sql
SELECT
    c.identificacion,
    c.nombre,
    c.estrato,
    COUNT(f.id) AS total_facturas,
    SUM(f.total) AS total_facturado,
    SUM(CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END) AS saldo_pendiente,
    SUM(CASE WHEN f.estado = 'vencida' THEN f.total ELSE 0 END) AS saldo_vencido
FROM clientes c
LEFT JOIN facturas f ON c.id = f.cliente_id
WHERE c.identificacion LIKE 'TEST%'
GROUP BY c.id, c.identificacion, c.nombre, c.estrato
ORDER BY c.identificacion;
```

### Ver detalles de nivelación (CASO 1 - Carlos Pérez)

```sql
SELECT
    numero_factura,
    fecha_desde,
    fecha_hasta,
    DATEDIFF(fecha_hasta, fecha_desde) + 1 AS dias,
    internet,
    varios,
    iva,
    total,
    observaciones
FROM facturas
WHERE cliente_id = (SELECT id FROM clientes WHERE identificacion = 'TEST001')
ORDER BY fecha_emision;
```

### Ver aplicación de IVA por estrato

```sql
SELECT
    c.identificacion,
    c.nombre,
    c.estrato,
    f.numero_factura,
    f.internet,
    f.s_iva AS iva_aplicado,
    CASE
        WHEN c.estrato IN ('1', '2', '3') THEN 'Sin IVA en Internet'
        ELSE 'Con IVA 19% en Internet'
    END AS regla_iva
FROM facturas f
INNER JOIN clientes c ON f.cliente_id = c.id
WHERE c.identificacion LIKE 'TEST%'
ORDER BY c.estrato, f.numero_factura;
```

---

## 🧪 CÓMO PROBAR EL SISTEMA

### 1. Cargar los datos de prueba

Ejecuta el script como se indicó en la sección "Cómo Cargar los Datos de Prueba"

### 2. Verificar en la interfaz

1. **Ver listado de clientes:**
   - Busca los clientes con identificación TEST001 a TEST005
   - Verifica que aparezcan con sus datos correctos

2. **Ver facturas de cada cliente:**
   - Abre cada cliente y revisa sus facturas
   - Verifica los periodos de facturación
   - Confirma los totales

3. **Verificar proceso de nivelación:**
   - Revisa las facturas de Carlos Pérez (TEST001)
   - Primera factura: 30 días
   - Segunda factura: 36 días (nivelación)
   - Tercera factura: 30 días (mes completo)

### 3. Pruebas de facturación automática

Si el sistema tiene un proceso de facturación automática mensual:

1. Simula el proceso para el periodo siguiente
2. Verifica que genere facturas de mes completo (30 días) para los clientes ya nivelados
3. Confirma la aplicación correcta de IVA según estrato

### 4. Pruebas de cobro y pagos

1. Marca algunas facturas como pagadas
2. Verifica que el saldo del cliente se actualice
3. Prueba marcar una factura pendiente como pagada

### 5. Pruebas de cartera

1. Revisa el reporte de cartera vencida
2. Verifica que Ana García (TEST005) aparezca con saldo vencido
3. Confirma el cálculo de intereses

---

## 🗑️ LIMPIAR DATOS DE PRUEBA

Si necesitas eliminar los datos de prueba:

```sql
-- Eliminar en orden correcto (respetando foreign keys)
DELETE FROM servicios_cliente WHERE cliente_id IN (
    SELECT id FROM clientes WHERE identificacion LIKE 'TEST%'
);

DELETE FROM facturas WHERE cliente_id IN (
    SELECT id FROM clientes WHERE identificacion LIKE 'TEST%'
);

DELETE FROM contratos WHERE cliente_id IN (
    SELECT id FROM clientes WHERE identificacion LIKE 'TEST%'
);

DELETE FROM varios_pendientes WHERE cliente_id IN (
    SELECT id FROM clientes WHERE identificacion LIKE 'TEST%'
);

DELETE FROM clientes WHERE identificacion LIKE 'TEST%';

-- Verificar limpieza
SELECT COUNT(*) AS clientes_prueba_restantes
FROM clientes
WHERE identificacion LIKE 'TEST%';
```

---

## 💡 NOTAS IMPORTANTES

### Sobre la nivelación de facturas

El sistema implementa un proceso de nivelación para que todos los clientes facturen del 1 al 30 de cada mes, independientemente de cuándo iniciaron el contrato:

- **Primera factura:** 30 días desde la fecha de activación
- **Segunda factura:** 30 días + días adicionales hasta fin de mes (nivelación)
- **Tercera factura en adelante:** Mes completo del 1 al 30

### Sobre el IVA

- Internet: Solo aplica IVA 19% en estratos 4, 5 y 6
- Televisión: Siempre aplica IVA 19% en todos los estratos
- Instalación, reconexión, varios: Siempre aplica IVA 19%

### Sobre las instalaciones

- **Con permanencia (6+ meses):** $50,000 + IVA
- **Sin permanencia:** $150,000 + IVA

---

## 📞 SOPORTE

Si tienes dudas sobre los datos de prueba o el proceso de facturación, consulta:

- `MANUAL_FACTURACION_Y_CLIENTES.md` - Manual completo de facturación
- `backend/services/FacturacionAutomaticaService.js` - Lógica de facturación automática
- `backend/basededatos.sql` - Estructura completa de la base de datos

---

## ✅ CHECKLIST DE VERIFICACIÓN

Usa este checklist para verificar que todo funciona correctamente:

- [ ] Los 5 clientes de prueba se crearon correctamente
- [ ] Cada cliente tiene su contrato asociado
- [ ] Los servicios están activos y asociados a los clientes
- [ ] Las facturas muestran los periodos correctos
- [ ] La primera factura de Carlos Pérez (TEST001) tiene 30 días
- [ ] La segunda factura de Carlos Pérez tiene 36 días (nivelación)
- [ ] La tercera factura de Carlos Pérez tiene 30 días (mes completo)
- [ ] El IVA se aplica correctamente según estrato
- [ ] Los costos de instalación son correctos (con/sin permanencia)
- [ ] Ana García (TEST005) tiene factura vencida con saldo e intereses
- [ ] Los totales de las facturas coinciden con los cálculos

---

**Fecha de creación:** 27 de Noviembre 2025
**Versión:** 1.0
**Sistema:** ERP-PSI - Sistema de Facturación Automática
