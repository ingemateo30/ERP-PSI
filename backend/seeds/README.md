# 📊 Datos de Prueba para Facturación Automática

Este directorio contiene datos de prueba completos para demostrar el funcionamiento del sistema de facturación automática del ERP-PSI.

## 🚀 Ejecución Rápida

```bash
# Opción 1: Usar Node.js (recomendado)
node backend/seeds/ejecutar_datos_prueba.js

# Opción 2: MySQL directo
mysql -u root -p erp_psi < backend/seeds/datos_prueba_facturacion.sql
```

## 📋 Archivos

- **`datos_prueba_facturacion.sql`** - Script SQL con los datos de prueba
- **`ejecutar_datos_prueba.js`** - Script Node.js para ejecutar y verificar los datos
- **`README.md`** - Este archivo

## 🎯 Casos de Prueba Incluidos

### 1. Carlos Pérez (TEST001) - Nivelación Completa ⭐
Demuestra el proceso completo de nivelación:
- **Primera factura:** 27 Jun - 26 Jul (30 días)
- **Segunda factura:** 27 Jul - 31 Ago (36 días - NIVELACIÓN)
- **Tercera factura:** 1 Sep - 30 Sep (30 días - mes completo)
- Estrato 2 (sin IVA en Internet)

### 2. María López (TEST002) - Internet + TV con IVA
- Múltiples servicios (Internet 50MB + TV Básica)
- Estrato 4 (con IVA 19%)
- Sin permanencia (instalación $150,000)

### 3. Juan Martínez (TEST003) - Estrato 1 + Descuento
- Estrato 1 (sin IVA)
- Incluye descuento promocional
- Con permanencia (instalación $50,000)

### 4. Empresa ABC (TEST004) - Comercial/Empresarial
- Internet empresarial con IVA
- Contrato comercial 12 meses
- Inició día 1 (mes completo desde inicio)

### 5. Ana García (TEST005) - Mora y Reconexión ⚠️
- Factura vencida
- Saldo anterior + intereses moratorios
- Cargo de reconexión
- Cliente suspendido

## 📊 Resumen de Datos Creados

- **5 Clientes** de prueba (TEST001 a TEST005)
- **5 Contratos** con diferentes configuraciones
- **10 Facturas** que demuestran todo el proceso
- **Diferentes servicios:** Internet, TV, Combos
- **Todos los escenarios:** Nivelación, IVA, mora, reconexión

## ✅ Verificación Rápida

Después de cargar los datos, ejecuta:

```sql
-- Ver clientes creados
SELECT identificacion, nombre, estrato, estado
FROM clientes
WHERE identificacion LIKE 'TEST%';

-- Ver facturas y sus periodos
SELECT
    f.numero_factura,
    c.nombre,
    f.fecha_desde,
    f.fecha_hasta,
    DATEDIFF(f.fecha_hasta, f.fecha_desde) + 1 AS dias,
    f.total
FROM facturas f
JOIN clientes c ON c.id = f.cliente_id
WHERE c.identificacion LIKE 'TEST%'
ORDER BY c.identificacion, f.fecha_emision;
```

## 📖 Documentación Completa

Para información detallada de cada caso, consulta:
**`../../GUIA_DATOS_PRUEBA_FACTURACION.md`**

## 🗑️ Limpiar Datos

Para eliminar los datos de prueba:

```sql
DELETE FROM servicios_cliente WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion LIKE 'TEST%');
DELETE FROM facturas WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion LIKE 'TEST%');
DELETE FROM contratos WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion LIKE 'TEST%');
DELETE FROM clientes WHERE identificacion LIKE 'TEST%';
```

---

**Nota:** Estos datos son seguros de usar en producción ya que todos los clientes tienen identificación que inicia con "TEST" y pueden eliminarse fácilmente.
