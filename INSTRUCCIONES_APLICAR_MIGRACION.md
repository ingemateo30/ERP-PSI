# 🚀 Instrucciones para Aplicar la Migración

## Estado Actual
✅ Código actualizado y pusheado al repositorio
✅ Mejoras implementadas en manejo de errores
⏳ **Falta aplicar la migración en la base de datos**

## Paso 1: Aplicar la Migración SQL

Desde tu terminal en el servidor, ejecuta:

```bash
cd ~/ERP-PSI
mysql -u root -p jelcom_internet < APLICAR_MIGRACION_CLIENTES.sql
```

Cuando te pida la contraseña, ingresa: `1234`

### Alternativa: Aplicar manualmente

Si prefieres hacerlo manualmente, ejecuta estos comandos SQL:

```bash
mysql -u root -p1234 jelcom_internet
```

Luego dentro de MySQL:

```sql
-- 1. Eliminar el UNIQUE KEY (causante del error)
ALTER TABLE `clientes` DROP INDEX `identificacion`;

-- 2. Crear índices compuestos para optimizar búsquedas
CREATE INDEX `idx_identificacion_ciudad` ON `clientes` (`identificacion`, `ciudad_id`);
CREATE INDEX `idx_identificacion_direccion` ON `clientes` (`identificacion`(20), `direccion`(100));

-- 3. Verificar que se aplicó correctamente
SHOW INDEX FROM clientes WHERE Column_name = 'identificacion';
```

**Resultado esperado:** Todos los índices deben mostrar `Non_unique: 1`

## Paso 2: Reiniciar el Servidor Backend

```bash
cd ~/ERP-PSI/backend
pm2 restart jelcom-backend
```

O si usas npm:

```bash
npm restart
```

## Paso 3: Verificar que Funciona

1. Intenta crear un cliente con identificación `1005450340` desde el frontend
2. Deberías ver un mensaje detallado con toda la información del cliente existente
3. Ya no debería aparecer el error: `Duplicate entry '1005450340' for key 'clientes.identificacion'`

## 🔍 Verificación Adicional (Opcional)

Para verificar que la migración se aplicó correctamente:

```bash
cd ~/ERP-PSI/backend
node verificar_y_aplicar_migracion.js
```

Este script te mostrará:
- Estado actual de los índices
- Clientes con identificaciones duplicadas (si existen)
- Información del cliente 1005450340

## ✅ Confirmación de Éxito

Sabrás que todo funciona cuando:

1. ✅ No hay error de "Duplicate entry"
2. ✅ Las alertas muestran información completa del cliente:
   - Nombre, dirección, teléfono
   - Servicios activos
   - Saldo pendiente
   - Sugerencias útiles
3. ✅ Puedes crear clientes con la misma identificación en diferentes direcciones

## 📄 Documentación Completa

Lee `SOLUCION_ERRORES_CLIENTES.md` para más detalles sobre:
- Qué cambios se hicieron
- Por qué se hicieron
- Cómo funcionan las nuevas alertas
- Casos de uso soportados

## 🆘 Si algo no funciona

1. Verifica que la migración se aplicó: `SHOW INDEX FROM clientes;`
2. Revisa los logs del backend: `pm2 logs jelcom-backend`
3. Asegúrate de que el servidor se reinició después de la migración
4. Verifica que no haya errores en la consola del navegador

---

**¡Listo!** Una vez aplicada la migración, el error de clientes duplicados desaparecerá completamente. 🎉
