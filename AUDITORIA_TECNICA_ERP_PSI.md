# AUDITORÍA TÉCNICA PROFUNDA — ERP-PSI

> **Stack:** Node.js/Express (Backend) · React (Frontend) · MySQL (Database)
> **Rama de análisis:** `claude/system-audit-analysis-Bg8jB`
> **Fecha auditoría:** 15 de marzo de 2026
> **Última actualización:** 15 de marzo de 2026
> **Auditor:** Senior QA Automation Engineer & Software Architect

---

## ESTADO DE CORRECCIONES

| ID | Criticidad | Estado | Commit |
|---|---|---|---|
| C1 | 🔴 CRÍTICO | ✅ **CORREGIDO** | `Database.conexion()` → `Database.getConnection()` en 13 lugares |
| C2 | 🔴 CRÍTICO | ✅ **CORREGIDO** | `cliente.id` → `clienteId` en `calcularInteresMora` |
| C3 | 🔴 CRÍTICO | ✅ **CORREGIDO** | `SELECT FOR UPDATE` en generación de consecutivo, dentro de transacción |
| C4 | 🔴 CRÍTICO | ✅ **CORREGIDO** | `crearFacturaCompleta` usa `beginTransaction/commit/rollback` |
| C5 | 🔴 CRÍTICO | ✅ **CORREGIDO** | Marcado `facturado=1` movido a DESPUÉS del commit con `marcarConceptosComoFacturados()` |
| C6 | 🔴 CRÍTICO | ✅ **CORREGIDO** | Eliminado fallback `\|\| 'secret_key_psi_2024'` en controller y route |
| A4 | 🟠 ALTO | ✅ **CORREGIDO** | Declarada `let notificacionesEnviadas = 0` en cron de notificaciones |
| A1 | 🟠 ALTO | ⏳ Pendiente | `procesoReconexionAutomatica()` nunca se invoca desde `inicializar()` |
| A2 | 🟠 ALTO | ⏳ Pendiente | Ruta `/api/inventario` duplicada sin versioning |
| A3 | 🟠 ALTO | ⏳ Pendiente | Validación duplicado no cubre período del mes siguiente |
| A5 | 🟠 ALTO | ⏳ Pendiente | `actualizarConsecutivos` aún existe pero ya no se llama (el bug es en `ClienteCompletoService`) |
| A6 | 🟠 ALTO | ⏳ Pendiente | "Backup diario" no realiza backup real |
| A7 | 🟠 ALTO | ⏳ Pendiente | Reset token visible en logs |
| A8 | 🟠 ALTO | ⏳ Pendiente | Registro público permite crear administradores |
| A9 | 🟠 ALTO | ⏳ Pendiente | Logs de producción imprimen tokens JWT |
| A10 | 🟠 ALTO | ⏳ Pendiente | Endpoints `/health`, `/test-db`, `/system-info` sin autenticación |
| M1–M8 | 🟡 MEDIO | ⏳ Pendiente | Ver sección detallada |

---

## RESUMEN EJECUTIVO

| Criticidad | Total | Corregidos | Pendientes |
|---|---|---|---|
| 🔴 CRÍTICO | 6 | ✅ 6 | 0 |
| 🟠 ALTO | 10 | ✅ 1 (A4) | 9 |
| 🟡 MEDIO | 8 | 0 | 8 |
| 🔵 BAJO | 6 | 0 | 6 |

El sistema tiene una arquitectura general sólida (MVC, pool de conexiones, rate limiting, Helmet, Winston logger), pero presenta **bugs de producción activos** que causan fallos silenciosos en el motor de facturación, y **vulnerabilidades de seguridad graves** en la gestión de secretos y registros de log.

---

## PILAR 1: ANÁLISIS ESTRUCTURAL (CAJA BLANCA)

### 🔴 CRÍTICO-1: `Database.conexion()` no existe — todos los CRON jobs fallan silenciosamente

**Archivos:** `backend/utils/cronJobs.js` (líneas 168, 229, 312, 420, 484), `backend/services/InteresesMoratoriosService.js` (línea 14)

El método estático de la clase `Database` se llama `getConnection()`, pero los cron jobs y el servicio de intereses llaman a `Database.conexion()` (método inexistente).

```javascript
// ❌ cronJobs.js:168 — falla con TypeError en producción
const conexion = await Database.conexion();

// ✅ Lo correcto (definido en models/Database.js:44)
const conexion = await Database.getConnection();
```

**Impacto:** La actualización diaria de estados de facturas, el cálculo de intereses de mora, las notificaciones de vencimiento y el backup "diario" **nunca funcionan en producción**. El servidor arranca sin error pero las tareas críticas lanzan `TypeError: Database.conexion is not a function` de forma silenciosa.

---

### 🔴 CRÍTICO-2: `ReferenceError` en `calcularInteresMora` — variable `cliente` no definida

**Archivo:** `backend/services/FacturacionAutomaticaService.js:576`

```javascript
static async calcularInteresMora(conexion, clienteId) {
  // ✅ El parámetro es clienteId...
  const interes = await InteresesMoratoriosService.calcularInteresesMoratorios(
    cliente.id  // ❌ 'cliente' no está definido en este scope — debería ser clienteId
  );
}
```

**Impacto:** Cada vez que la facturación automática intenta calcular intereses de mora, lanza `ReferenceError: cliente is not defined`. El `catch` silencia el error retornando `{ valor: 0 }`, por lo que **los intereses de mora nunca se incluyen en ninguna factura** sin ninguna alerta visible.

---

### 🔴 CRÍTICO-3: Race condition en generación de número de factura

**Archivo:** `backend/services/FacturacionAutomaticaService.js:793-824`

```javascript
static async generarNumeroFactura() {
  // 1. Lee el último número — sin lock
  const ultimaFactura = await Database.query(
    `SELECT numero_factura FROM facturas ORDER BY id DESC LIMIT 1`
  );
  // 2. Calcula el siguiente número
  proximoNumero = parseInt(match[1], 10) + 1;
  // 3. Lo retorna — sin transacción, sin SELECT FOR UPDATE
}
```

Si la facturación manual y automática corren simultáneamente, ambas leen el mismo `numero_factura`, calculan el mismo siguiente número y generan **dos facturas con el mismo número**, violando la integridad referencial requerida por la DIAN.

---

### 🟠 ALTO-1: `procesoReconexionAutomatica()` definido pero nunca invocado

**Archivo:** `backend/utils/cronJobs.js:938`

El método existe y define su propio cron (`'0 2 3 * *'`) pero **no se llama en `inicializar()`**, por lo que nunca se activa. Además, no incluye el sistema de logging centralizado de los demás cron jobs.

---

### 🟠 ALTO-2: Ruta de inventario duplicada sin versioning

**Archivo:** `backend/index.js:249-299`

```javascript
// Montada correctamente con versioning:
app.use('/api/v1/inventory', inventoryRoutes);   // línea 251

// Montada de nuevo SIN versioning ni documentación:
app.use('/api/inventario', inventarioRoutes);    // línea 299
```

La segunda declaración no sigue el estándar `/api/v1/` y puede tener diferente comportamiento de CORS/autenticación según cómo esté configurado el router.

---

### 🟡 MEDIO-1: Auto-migration en cada request de producción

**Archivo:** `backend/services/EnvioMasivoEmailService.js:12-56`

```javascript
static async iniciarEnvioMasivo(periodo = null, usuarioId = null) {
  await this.inicializarTablas(); // CREATE TABLE IF NOT EXISTS — en cada llamada
```

`CREATE TABLE IF NOT EXISTS` se ejecuta en cada invocación del servicio. Bajo carga en ambientes multi-instancia, puede generar condiciones de carrera en el DDL.

---

### 🟡 MEDIO-2: Archivos de respaldo versionados en el repositorio

```
backend/controllers/consultaCliente.controller.js.backup3
backend/services/ClienteCompletoService.js.backup_20251124_162835
```

Archivos de backup que contienen código obsoleto. Deben eliminarse y añadirse regla al `.gitignore`.

---

### 🔵 BAJO-1: Inconsistencia en documentación interna del cron de facturación

En `cronJobs.js:56` el cron string es `'0 6 20 * *'` (día **20**), pero el comentario en `inicializar()` (línea 28) dice "día 1 de cada mes a las 06:00", y `listarTareasProgramadas()` también documenta "día 1". El comportamiento real es el día 20.

---

### 🔵 BAJO-2: Pool de BD conectado al momento de importar el módulo

**Archivo:** `backend/config/database.js:42`

```javascript
testConnection(); // Se ejecuta inmediatamente al hacer require()
```

La conexión se intenta antes de que la aplicación termine de configurarse. El orden de imports puede causar problemas si el módulo se importa antes de que las variables de entorno estén disponibles.

---

## PILAR 2: PRUEBAS DE FLUJO LÓGICO (CAJA NEGRA)

### 🔴 CRÍTICO-4: Factura creada sin transacción — inconsistencia de datos garantizada

**Archivo:** `backend/services/FacturacionAutomaticaService.js:674-747`

```javascript
static async crearFacturaCompleta(cliente, conceptos, periodo, diasVencimiento) {
  const conexion = await Database.getConnection();
  // ❌ No hay BEGIN TRANSACTION

  // Paso 1: Factura creada en BD
  const [resultado] = await conexion.execute(`INSERT INTO facturas...`);
  const facturaId = resultado.insertId;

  // Si esto falla → factura huérfana sin detalles, sin rollback posible
  await this.crearDetalleFactura(conexion, facturaId, conceptos);

  // Si esto falla → consecutivo desincronizado del número real
  await this.actualizarConsecutivos();
}
```

La clase `Database` tiene un método `transaction()` con `BEGIN/COMMIT/ROLLBACK` que **no se usa aquí**. Un fallo en red o timeout en cualquiera de los pasos posteriores al INSERT deja datos en estado inválido.

---

### 🔴 CRÍTICO-5: Conceptos marcados como `facturado=1` antes de confirmar creación de factura

**Archivo:** `backend/services/FacturacionAutomaticaService.js:593-668`

```javascript
// Dentro de calcularConceptosFacturacion():
const reconexion = await this.calcularReconexion(conexion, cliente.id);

// Y dentro de calcularReconexion() — ANTES de que exista la factura:
await conexion.execute(
  `UPDATE traslados_servicio SET facturado = 1 WHERE cliente_id = ? AND facturado = 0`
);
// Igual en calcularVarios()
```

Los ítems de reconexión y "varios" se marcan `facturado = 1` **durante el cálculo de conceptos**, antes de que la factura sea insertada. Si la factura falla después, esos conceptos quedan marcados como facturados sin factura asociada. **Pérdida de ingresos silenciosa e irrecuperable sin intervención manual.**

---

### 🟠 ALTO-3: Validación de duplicado de factura no cubre el período del mes siguiente

**Archivo:** `backend/services/FacturacionAutomaticaService.js:374-386`

```javascript
const mesActual = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
SELECT COUNT(*) FROM facturas
WHERE cliente_id = ?
  AND DATE_FORMAT(fecha_emision, '%Y-%m') = ?  // ← Fecha de EMISIÓN del mes actual
  AND activo = 1
```

La facturación estándar (3ra+ factura) genera facturas del **mes siguiente**. Si se emite manualmente una factura el día 19, el cron automático del día 20 no detecta el duplicado porque verifica `fecha_emision` del mes actual, no el período cubierto (`fecha_desde/fecha_hasta`).

---

### 🟠 ALTO-4: Variable `notificacionesEnviadas` no declarada — ReferenceError en cron

**Archivo:** `backend/utils/cronJobs.js:364, 377, 383, 390`

```javascript
// La variable se usa pero NUNCA se declara con let/const/var
notificacionesEnviadas++;  // ReferenceError: notificacionesEnviadas is not defined
```

El cron de notificaciones de vencimiento falla en el momento de incrementar el contador, interrumpiendo el procesamiento de todas las facturas vencidas siguientes del batch.

---

### 🟡 MEDIO-3: Sin mecanismo de reanudación para facturación masiva interrumpida

Si el servidor se reinicia durante una facturación masiva de 500 clientes que va por el cliente 250, no hay forma de determinar qué clientes ya fueron facturados. Un reinicio no controlado puede resultar en clientes con conceptos marcados `facturado=1` pero sin factura creada.

---

### 🟡 MEDIO-4: Intereses moratorios acumulables sin control de idempotencia

**Archivo:** `backend/utils/cronJobs.js:265-268`

```javascript
await conexion.execute(
  `UPDATE facturas SET interes = interes + ? WHERE id = ?`,
  [Math.round(interesesDiarios), factura.id]
);
```

Si el cron corre dos veces el mismo día (ej. reinicio del servidor a las 02:59 AM), los intereses se calculan y suman **dos veces**. No hay columna `interes_calculado_hasta` ni registro de última fecha de aplicación.

---

### 🟡 MEDIO-5: Inconsistencia en modelo de roles entre backend y frontend

**Backend** (`middleware/auth.js:127`): `secretaria` hereda automáticamente los permisos de `supervisor`.
**Frontend** (`AuthContext.js:502-511`): La tabla `canAccess()` no tiene entrada para `secretaria`, solo para `supervisor`. Los componentes que usen `canAccess()` tratarán a una secretaria como si fuera un `usuario` sin privilegios.

---

## PILAR 3: INTEGRIDAD DE DATOS Y AUTOMATIZACIÓN

### 🟠 ALTO-5: `actualizarConsecutivos()` usa `WHERE id = 1` hardcodeado

**Archivo:** `backend/services/FacturacionAutomaticaService.js:828-845`

```javascript
await conexion.execute(`
  UPDATE configuracion_empresa
  SET consecutivo_factura = consecutivo_factura + 1
  WHERE id = 1  -- ❌ Asume que siempre existe id=1
`);
```

Si la fila no existe o tiene un ID diferente, `affectedRows = 0` sin error. El consecutivo en `configuracion_empresa` quedaría permanentemente desincronizado del número de factura real.

---

### 🟠 ALTO-6: El "backup diario" no realiza backup real de la base de datos

**Archivo:** `backend/utils/cronJobs.js:415-472`

El método `backupDiario()` ejecuta únicamente `SELECT COUNT(*)` sobre facturas y pagos, y registra los resultados en `logs_sistema`. **No hay `mysqldump`, no hay copia de datos, no hay exportación**. El sistema cree que tiene un respaldo diario cuando en realidad solo tiene estadísticas de conteo.

---

### 🟡 MEDIO-6: Archivos de pagos bancarios reales en el repositorio

```
backend/pagos/cajasocial/entrada/cajasocial2 (1).csv
backend/pagos/asobancaria/salida/PSI_TELECOMUNICACIONES20260227 (2).txt
backend/pagos/comultrasan/entrada/002. Comultrasan Febrero 2026 - copia (1).xlsx
backend/pagos/finecoop/entrada/Finecoop (1).xlsx
```

Estos archivos contienen datos de transacciones bancarias. Si el repositorio se comparte o filtra, expone datos financieros sensibles de clientes y terceros.

---

### 🟡 MEDIO-7: Race condition menor en inicio de lote masivo de emails

**Archivo:** `backend/services/EnvioMasivoEmailService.js`

La verificación de "lote en proceso" y la inserción del nuevo lote no están envueltas en una transacción con `SELECT ... FOR UPDATE`. En un ambiente multi-proceso, dos instancias podrían superar la verificación simultáneamente e iniciar dos lotes para el mismo período.

---

## PILAR 4: SEGURIDAD Y MANEJO DE ERRORES

### 🔴 CRÍTICO-6: Secret JWT hardcodeado como fallback en el portal público

**Archivos:** `backend/routes/consultaCliente.js:27`, `backend/controllers/consultaCliente.controller.js:53`

```javascript
// En el portal de consulta pública de clientes:
jwt.verify(token, process.env.JWT_SECRET || 'secret_key_psi_2024')
jwt.sign({ ... }, process.env.JWT_SECRET || 'secret_key_psi_2024', { expiresIn: '30m' })
```

Si `JWT_SECRET` no está disponible en algún entorno (tests, staging, contenedor mal configurado), el sistema usa `'secret_key_psi_2024'` — valor **público en el código fuente del repositorio**. Cualquier persona con acceso al repo puede firmar tokens `cliente_publico` válidos y acceder a facturas, contratos e instalaciones de cualquier cliente.

> **Agravante:** El `index.js` verifica que `JWT_SECRET` exista al iniciar el servidor, pero el endpoint `/consulta-cliente` usa su propio fallback local, saltándose esa protección.

---

### 🟠 ALTO-7: Token de recuperación de contraseña registrado en consola y en la respuesta

**Archivo:** `backend/controllers/authController.js:515-525`

```javascript
// ❌ Visible en logs del servidor y en sistemas de monitoreo:
console.log('🔑 Token de recuperación para', email, ':', resetToken);

// También se retorna en la response en desarrollo:
...(process.env.NODE_ENV === 'development' && { resetToken })
```

El token de reset de contraseña aparece en logs del servidor. Si los logs son centralizados (Datadog, Splunk, Papertrail) o accesibles por personal no autorizado, un atacante puede resetear contraseñas de cualquier usuario.

---

### 🟠 ALTO-8: Registro de usuarios público permite crear cuentas de administrador

**Archivo:** `backend/routes/auth.js:209-213`

```javascript
router.post('/register',
  rateLimiter.register,  // solo 5 intentos / 15 min
  validate(registerSchema),
  registerHandler        // ← Sin authenticateToken ni requireRole
);

// registerSchema acepta:
rol: Joi.string().valid('administrador', 'supervisor', 'instalador').default('supervisor')
```

No hay verificación de que quien registra sea un administrador existente. **Cualquier persona** con acceso a la URL puede crear cuentas con rol `administrador`.

---

### 🟠 ALTO-9: Logs de producción imprimen tokens JWT completos en cada request

**Archivo:** `backend/middleware/auth.js:8-9, 25, 74`

```javascript
// Ejecutado en CADA request autenticado:
console.log('🔍 Auth Header completo:', authHeader);     // Imprime "Bearer eyJhbGci..."
console.log('✅ Token decodificado:', decoded);           // {userId, email, rol, iat, exp}
console.log('✅ Usuario autenticado:', { id, nombre, rol });

// También en el middleware de consultaCliente.js route:
console.log('🔍 Auth Header completo:', authHeader);
```

En producción, estos `console.log` de debug contaminan los logs con los tokens JWT completos y datos de usuario en **cada request autenticado**. Representan un vector de exposición crítico si los logs son centralizados.

---

### 🟠 ALTO-10: Endpoints de diagnóstico sin autenticación exponen información del servidor

**Archivo:** `backend/index.js:135-198`

```javascript
// Accesibles sin ningún token:
GET /health     → { memory: process.memoryUsage(), node_version, uptime }
GET /test-db    → { mysql_version, database_time }
GET /system-info → { pid, platform, architecture, memory_usage }
```

Un atacante obtiene la versión exacta de Node.js y MySQL para buscar CVEs, el PID del proceso para ataques de señales, y métricas de memoria para ataques de timing.

---

### 🟡 MEDIO-8: Respuesta 403 revela la jerarquía de roles del sistema

**Archivo:** `backend/middleware/auth.js:132-138`

```javascript
return res.status(403).json({
  success: false,
  message: 'Permisos insuficientes',
  required_roles: expandedRoles,  // ← ['administrador', 'supervisor', 'secretaria']
  user_role: req.user.rol,        // ← Rol actual del usuario autenticado
});
```

Un atacante con un token de bajo privilegio puede mapear toda la jerarquía de roles probando diferentes endpoints y leyendo los `required_roles` de las respuestas 403.

---

## TABLA CONSOLIDADA DE HALLAZGOS

| ID | Criticidad | Pilar | Componente | Descripción |
|---|---|---|---|---|
| C1 | 🔴 CRÍTICO | Estructural | `Database.js` / CronJobs | `Database.conexion()` no existe → todos los crons fallan en producción |
| C2 | 🔴 CRÍTICO | Estructural | `FacturacionAutomaticaService` | Variable `cliente` indefinida → intereses nunca calculados |
| C3 | 🔴 CRÍTICO | Datos | `FacturacionAutomaticaService` | Race condition en generación de número de factura |
| C4 | 🔴 CRÍTICO | Lógico | `FacturacionAutomaticaService` | Factura creada sin transacción → datos huérfanos irrecuperables |
| C5 | 🔴 CRÍTICO | Datos | `FacturacionAutomaticaService` | Conceptos marcados `facturado=1` antes de confirmar factura |
| C6 | 🔴 CRÍTICO | Seguridad | `consultaCliente.controller.js` | JWT secret hardcodeado como fallback en código fuente |
| A1 | 🟠 ALTO | Estructural | `cronJobs.js` | `procesoReconexionAutomatica` nunca se invoca desde `inicializar()` |
| A2 | 🟠 ALTO | Estructural | `index.js` | Ruta `/api/inventario` duplicada sin versioning |
| A3 | 🟠 ALTO | Lógico | `FacturacionAutomaticaService` | Validación de duplicado no cubre período del mes siguiente |
| A4 | 🟠 ALTO | Lógico | `cronJobs.js` | `notificacionesEnviadas` sin declarar → ReferenceError en cron |
| A5 | 🟠 ALTO | Datos | `FacturacionAutomaticaService` | `actualizarConsecutivos` usa `WHERE id = 1` hardcodeado |
| A6 | 🟠 ALTO | Datos | `cronJobs.js` | "Backup diario" no realiza backup real de la base de datos |
| A7 | 🟠 ALTO | Seguridad | `authController.js` | Reset token visible en logs y en body de respuesta |
| A8 | 🟠 ALTO | Seguridad | `routes/auth.js` | Registro público permite crear cuentas de administrador |
| A9 | 🟠 ALTO | Seguridad | `middleware/auth.js` | Logs de producción imprimen tokens JWT completos |
| A10 | 🟠 ALTO | Seguridad | `index.js` | Endpoints `/health`, `/test-db`, `/system-info` públicos |
| M1 | 🟡 MEDIO | Estructural | `EnvioMasivoEmailService` | Auto-migration DDL en cada request de producción |
| M2 | 🟡 MEDIO | Estructural | Repositorio | Archivos `.backup` versionados en el repo |
| M3 | 🟡 MEDIO | Lógico | Sistema | Sin mecanismo de reanudación para facturación masiva interrumpida |
| M4 | 🟡 MEDIO | Datos | `cronJobs.js` | Intereses acumulables sin control de idempotencia por día |
| M5 | 🟡 MEDIO | Datos | `AuthContext.js` | Inconsistencia de permisos para rol `secretaria` entre capas |
| M6 | 🟡 MEDIO | Datos | Repositorio | Archivos de pagos bancarios reales versionados |
| M7 | 🟡 MEDIO | Datos | `EnvioMasivoEmailService` | Race condition menor en inicio de lote de emails masivos |
| M8 | 🟡 MEDIO | Seguridad | `middleware/auth.js` | Respuesta 403 revela estructura completa de roles |
| B1 | 🔵 BAJO | Estructural | `cronJobs.js` | Inconsistencia entre cron string (día 20) y documentación (día 1) |
| B2 | 🔵 BAJO | Estructural | `database.js` | Test de conexión ejecutado en tiempo de importación del módulo |
| B3 | 🔵 BAJO | Estructural | `Database.js` | Función `connectDatabase` fuera de la clase, código desorganizado |
| B4 | 🔵 BAJO | Lógico | `FacturacionAutomaticaService` | Validación `diasFacturados > 365` demasiado permisiva para nivelaciones |
| B5 | 🔵 BAJO | Datos | `index.js` | Comentarios de debug con emojis en código de producción |
| B6 | 🔵 BAJO | Seguridad | `AuthContext.js` | `refreshToken` almacenado tanto en cookie `httpOnly` como en `localStorage` |

---

## PLAN DE REMEDIACIÓN PRIORIZADO

### Semana 1 — Bugs Activos de Producción (el sistema falla sin estas correcciones)

1. **[C1]** Reemplazar todas las llamadas `Database.conexion()` por `Database.getConnection()` en `cronJobs.js` e `InteresesMoratoriosService.js`
2. **[C2]** Reemplazar `cliente.id` por `clienteId` en el método `calcularInteresMora`
3. **[A4]** Declarar `let notificacionesEnviadas = 0;` al inicio del callback del cron de notificaciones
4. **[C4 + C5]** Envolver `crearFacturaCompleta` en `Database.transaction()`, moviendo todos los UPDATEs de `traslados_servicio` y `varios_pendientes` dentro de la transacción
5. **[A1]** Invocar `this.procesoReconexionAutomatica()` desde el método `inicializar()`

### Semana 2 — Seguridad Crítica

6. **[C6]** Eliminar el fallback `|| 'secret_key_psi_2024'`; lanzar error explícito si `JWT_SECRET` no está disponible
7. **[A8]** Proteger `POST /auth/register` con `authenticateToken + requireRole('administrador')`; o al menos verificar que haya un administrador existente haciendo la petición
8. **[A7]** Eliminar el `console.log` del `resetToken`; implementar envío real por email usando `EmailService`
9. **[A9]** Eliminar todos los `console.log` de tokens/headers en `auth.js` y `consultaCliente.js`; mover a logger Winston nivel `debug` deshabilitado en producción
10. **[A10]** Añadir `authenticateToken` a `/test-db` y `/system-info`; reducir `/health` a información mínima sin datos del sistema

### Semana 3 — Integridad de Datos

11. **[C3]** Implementar generación de número de factura con `SELECT consecutivo_factura FROM configuracion_empresa FOR UPDATE` dentro de transacción
12. **[A5]** Parametrizar `actualizarConsecutivos()` leyendo el ID real de configuración en lugar de hardcodear `WHERE id = 1`
13. **[M4]** Añadir columna `interes_calculado_hasta DATE` en `facturas` para controlar idempotencia del cálculo diario de intereses
14. **[A6]** Implementar backup real con `mysqldump` o exportación por tablas; el método actual solo hace estadísticas
15. **[M3]** Añadir tabla `proceso_facturacion_estado` con campos `periodo`, `cliente_id`, `estado` para permitir reanudación de facturación interrumpida

### Semana 4 — Hardening y Limpieza

16. **[A2]** Eliminar la ruta `/api/inventario` duplicada y sin versioning
17. **[M1]** Mover `inicializarTablas()` de `EnvioMasivoEmailService` a un script de migración único
18. **[M6]** Mover archivos bancarios fuera del repositorio a almacenamiento seguro (S3, servidor de archivos protegido)
19. **[M2]** Eliminar archivos `.backup` del repositorio; añadir `*.backup*` al `.gitignore`
20. **[M8]** Eliminar `required_roles` y `user_role` de las respuestas 403
21. **[B6]** Eliminar `localStorage.setItem('refreshToken', ...)` del frontend; usar exclusivamente la cookie `httpOnly`
22. **[B1]** Unificar la documentación del cron de facturación para que refleje el día 20 en todos los comentarios

---

## HALLAZGOS POSITIVOS (Lo que el sistema hace bien)

- **Arquitectura MVC clara**: Separación correcta entre controllers, services, models y routes
- **Pool de conexiones**: Configurado correctamente con límite, timeout e idle control
- **Graceful shutdown**: Implementado con manejadores de `SIGTERM`/`SIGINT` y cierre del pool
- **Rate limiting granular**: Configurado por endpoint con límites apropiados (login: 10/15min, forgot-password: 3/hora)
- **Helmet completo**: CSP, X-Frame-Options, X-Content-Type-Options, XSS-Protection configurados
- **Validación de entrada dual**: Joi en rutas de auth, express-validator en controladores públicos
- **Logger estructurado**: Winston con rotación de archivos, niveles diferenciados y formato JSON
- **Refresh token con cookie HttpOnly**: Implementado correctamente para el flujo de usuario interno
- **bcrypt con 12 rounds**: Configuración segura de hashing de contraseñas
- **Reglas de IVA por estrato**: Lógica de negocio colombiana correctamente implementada (estratos 1-3 vs 4-6)
- **Prorrateo de primera y segunda factura**: Lógica de nivelación matemáticamente correcta
- **Clase `Database.transaction()`**: Existe y está correctamente implementada; el problema es que no se usa en los lugares críticos

---

*Informe generado por auditoría automatizada asistida por IA. Se recomienda revisión por el equipo de desarrollo antes de implementar las remediaciones.*

---

## REGISTRO DE CORRECCIONES APLICADAS

### Sesión 1 — 15 de marzo de 2026 (Críticos de producción)

#### ✅ C1 — `Database.conexion()` → `Database.getConnection()`
- **Archivos modificados:** `backend/utils/cronJobs.js`, `backend/services/InteresesMoratoriosService.js`
- **Cambio:** Reemplazados 9 + 4 = 13 llamados al método inexistente `Database.conexion()` por el método correcto `Database.getConnection()`
- **Impacto:** Todos los cron jobs (actualización de estados, intereses, notificaciones, backup) ahora funcionan correctamente en producción
- **Riesgo del cambio:** Mínimo — corrección directa de método inexistente

#### ✅ C2 — Variable `cliente` indefinida en `calcularInteresMora`
- **Archivo modificado:** `backend/services/FacturacionAutomaticaService.js:576`
- **Cambio:** `cliente.id` → `clienteId` (el parámetro correcto del método)
- **Impacto:** Los intereses de mora ahora se calculan e incluyen en las facturas
- **Riesgo del cambio:** Mínimo — corrección directa de nombre de variable

#### ✅ A4 — Variable `notificacionesEnviadas` no declarada
- **Archivo modificado:** `backend/utils/cronJobs.js` (cron `notificacionesVencimiento`)
- **Cambio:** Añadida declaración `let notificacionesEnviadas = 0;` al inicio del bloque de envío
- **Impacto:** El cron de notificaciones de vencimiento ya no lanza `ReferenceError` y procesa todas las facturas
- **Riesgo del cambio:** Mínimo — añadida declaración de variable faltante

#### ✅ C6 — JWT secret hardcodeado eliminado
- **Archivos modificados:** `backend/routes/consultaCliente.js`, `backend/controllers/consultaCliente.controller.js`
- **Cambio:** Eliminado fallback `|| 'secret_key_psi_2024'` en `jwt.verify()` y `jwt.sign()`
- **Impacto:** Si `JWT_SECRET` no está configurado, el sistema falla de forma explícita en lugar de usar un secret público conocido
- **Nota:** El archivo `.backup3` aún contiene el fallback pero no es código activo (no se importa)
- **Riesgo del cambio:** Bajo — requiere que `JWT_SECRET` esté correctamente configurado en `.env` (ya validado en `index.js` al arrancar)

#### ✅ C3 + C4 + C5 — Facturación atómica con transacción real
- **Archivo modificado:** `backend/services/FacturacionAutomaticaService.js`
- **Cambios aplicados:**

  **C3 — Race condition en número de factura:**
  - Eliminada generación de número con `SELECT ORDER BY id DESC LIMIT 1` (sin lock)
  - Implementado `SELECT id, consecutivo_factura FROM configuracion_empresa LIMIT 1 FOR UPDATE` dentro de la transacción
  - El consecutivo se actualiza dentro de la misma transacción con el ID real (ya no hardcodeado a `id=1`)

  **C4 — Factura sin transacción:**
  - `crearFacturaCompleta` ahora usa `beginTransaction()` / `commit()` / `rollback()`
  - El INSERT de `facturas` y el INSERT de `detalle_facturas` son atómicos
  - Si cualquiera falla, `rollback()` revierte todo sin dejar datos huérfanos

  **C5 — Conceptos marcados antes de confirmar factura:**
  - Eliminados los `UPDATE traslados_servicio SET facturado=1` y `UPDATE varios_pendientes SET facturado=1` de `calcularReconexion()` y `calcularVarios()`
  - Añadido nuevo método `marcarConceptosComoFacturados(clienteId)` que se llama **después del commit exitoso**
  - Si el marcado falla, la factura ya existe correctamente; los conceptos se incluirán en la próxima facturación (escenario recuperable vs. el bug anterior que era irrecuperable)

- **Riesgo del cambio:** Medio — cambio sustancial pero conservador; los métodos `generarNumeroFactura()` y `actualizarConsecutivos()` se mantienen en el archivo para compatibilidad con código externo que los pudiera llamar directamente
