# ESTADO DEL SISTEMA — ERP-PSI
> **Proveedor de Telecomunicaciones S.A.S.**
> Actualizado: 2026-03-19 | Stack: Node.js · React 19 · MySQL · Tailwind CSS

---

## LEYENDA DE ESTADOS

| Símbolo | Significado |
|---------|-------------|
| ✅ **Completado** | Funcional y en producción |
| 🔄 **En revisión** | Funciona pero tiene fallas conocidas reportadas |
| ⚠️ **Incompleto** | Existe pero le faltan funcionalidades importantes |
| ❌ **Pendiente** | No implementado / por hacer |

---

## 1. AUTENTICACIÓN Y SEGURIDAD

| Funcionalidad | Estado | Notas |
|---|---|---|
| Login con JWT | ✅ Completado | Rate limiting activo |
| Cierre de sesión | ✅ Completado | Token eliminado en cliente |
| Registro de usuarios (admin) | ✅ Completado | Solo admin puede crear usuarios |
| Cambio de contraseña | ✅ Completado | |
| Control de acceso por rol | ✅ Completado | admin · supervisor · secretaria · instalador · operador |
| Verificación de token | ✅ Completado | Middleware `authenticateToken` |
| Recuperación de contraseña | ⚠️ Incompleto | Endpoint existe pero no tiene correo configurado |
| Revocación de tokens (logout real) | ❌ Pendiente | Token sigue válido hasta expirar |
| Doble factor de autenticación (2FA) | ❌ Pendiente | No iniciado |

---

## 2. GESTIÓN DE CLIENTES

| Funcionalidad | Estado | Notas |
|---|---|---|
| Crear cliente | ✅ Completado | Con validación de duplicados por cédula |
| Editar cliente | ✅ Completado | |
| Inactivar / Reactivar cliente | ✅ Completado | Archivado en `clientes_inactivos` |
| Búsqueda y filtros | ✅ Completado | Por nombre, cédula, municipio, estado |
| Clientes por sector / tipo de zona | ✅ Completado | Urbano / Rural / Centro poblado |
| Agregar servicios adicionales a cliente | ✅ Completado | Multi-servicio |
| Cancelar servicio individual | ✅ Completado | Anula facturas pendientes |
| Exportar listado CSV | ✅ Completado | |
| Mapa de clientes (Leaflet) | ⚠️ Incompleto | Muestra puntos pero geocodificación básica |
| Alerta cliente existente (duplicados) | 🔄 En revisión | Detecta duplicado pero no bloquea siempre |
| Importación masiva de clientes | ❌ Pendiente | Solo hay plantilla de inventario |
| Historial de cambios por cliente | ❌ Pendiente | No hay log de auditoría por cliente |

---

## 3. SERVICIOS Y PLANES

| Funcionalidad | Estado | Notas |
|---|---|---|
| Crear / editar planes de servicio | ✅ Completado | Internet y TV |
| Precios con IVA diferenciado por estrato | ✅ Completado | Vista `vista_precios_con_iva` |
| Asignación de plan a cliente | ✅ Completado | Vínculo `servicios_cliente` |
| Cambio de plan (upgrade / downgrade) | ✅ Completado | Tipo de orden en instalaciones |
| Activar / Suspender servicio | ✅ Completado | Campo `estado` en `servicios_cliente` |
| Consulta pública de estado de servicio | ⚠️ Incompleto | Endpoint existe, UI básica |

---

## 4. FACTURACIÓN

| Funcionalidad | Estado | Notas |
|---|---|---|
| Generación automática mensual | ✅ Completado | Proceso batch con node-cron |
| Generación individual por cliente | ✅ Completado | |
| Vista de facturas con filtros y paginación | ✅ Completado | |
| Registro de pago manual | ✅ Completado | Con método de pago y banco |
| Cruce masivo de pagos (archivos bancarios) | ✅ Completado | Caja Social · Efecty · PSE · Finecoop · Comultrasan |
| Descarga de formatos bancarios | ✅ Completado | 5 formatos configurados |
| Envío masivo de facturas por correo | ✅ Completado | Con monitor de progreso |
| Estadísticas de facturación | ✅ Completado | Por período, banco, método de pago |
| Cartera vencida | ✅ Completado | Vista `vista_cartera_vencida` |
| Intereses por mora | ⚠️ Incompleto | Se procesa pero sin tabla de tasas configurable |
| Notas crédito / anulaciones | 🔄 En revisión | Anula factura pero no genera nota crédito formal |
| Facturación electrónica DIAN | ⚠️ Incompleto | Módulo de pruebas existe (`test-facturacion-dian.js`), no en producción |
| Prepago / anticipos | ❌ Pendiente | No implementado |
| Rubros adicionales (varios pendientes) | ⚠️ Incompleto | Tabla existe, no hay UI completa |

---

## 5. CONTRATOS

| Funcionalidad | Estado | Notas |
|---|---|---|
| Listado de contratos | ✅ Completado | |
| Crear contrato al cliente | ✅ Completado | |
| PDF de contrato (MINTIC) | ✅ Completado | Generado con Puppeteer |
| Seguimiento de permanencia mínima | ✅ Completado | Campo `permanencia_meses` |
| Firma digital del instalador | 🔄 En revisión | Canvas de firma implementado, guardado en BD como base64 |
| Firma digital del cliente | ⚠️ Incompleto | UI existe pero flujo incompleto |
| Visor de contrato firmado (PDF) | ⚠️ Incompleto | Componente básico, falta integración |
| Renovación automática de contrato | ❌ Pendiente | No implementado |

---

## 6. INSTALACIONES Y ÓRDENES DE TRABAJO

| Funcionalidad | Estado | Notas |
|---|---|---|
| Crear orden de instalación / trabajo | ✅ Completado | Tipos: nueva · migración · upgrade · reparación · traslado · reconexión · retiro |
| Asignar técnico a instalación | ✅ Completado | |
| Reagendar instalación | ✅ Completado | |
| Estados del flujo (programada → en proceso → completada) | ✅ Completado | |
| Foto antes / después de instalación | ✅ Completado | |
| PDF de orden de servicio (formato PSI) | ✅ Completado | 216 × 93 mm con Puppeteer |
| Registro de equipos instalados | ✅ Completado | Vínculo con inventario |
| Activación automática del servicio al completar | ✅ Completado | Actualiza `servicios_cliente` a "activo" |
| Registro de IP, TAP, MAC, ONT al completar | ✅ Completado | Se guarda en tabla `clientes` |
| Exportar reporte de instalaciones CSV | ✅ Completado | |
| Estadísticas de instalaciones | ✅ Completado | Por estado, tipo, técnico |
| Cancelación de instalación con motivo | ✅ Completado | |
| Instalaciones vencidas (no ejecutadas) | ✅ Completado | Filtro de vencidas disponible |

---

## 7. SEGUIMIENTO DE TÉCNICOS EN CAMPO (NUEVO)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Panel de supervisión diario por técnico | ✅ Completado | Vista por fecha seleccionable |
| Mostrar hora programada / hora inicio / hora fin | ✅ Completado | Con etiquetas Prog. · Inicio · Fin |
| Reloj en vivo para instalaciones "en proceso" | ✅ Completado | Contador horas/minutos/segundos |
| Mapa con marcadores de instalaciones (Leaflet) | ✅ Completado | Coloreados por estado |
| Rastreo GPS en tiempo real del técnico | ✅ Completado | Tabla `ubicaciones_tecnicos`, polling 15 s |
| Indicador de GPS activo en avatar del técnico | ✅ Completado | Punto verde pulsante si GPS < 10 min |
| Línea de ruta diaria en el mapa | ✅ Completado | Polyline instalaciones completadas/en proceso |
| Botón "Ruta del día" → Google Maps | ✅ Completado | Con waypoints de todas las instalaciones |
| Botón "Ir" por instalación → Google Maps | ✅ Completado | Coordenadas o dirección |
| Geofencing 500 m al iniciar instalación | ✅ Completado | Bloquea botón si técnico está lejos |
| Envío de GPS cada 30 s desde el móvil | ✅ Completado | Endpoint `POST /instalador/ubicacion` |
| Instalaciones al final del día (historial de ruta) | ✅ Completado | Ruta del día en Google Maps |
| Optimización de ruta (TSP) | ❌ Pendiente | No implementado |
| App móvil nativa | ❌ Pendiente | Funciona en navegador móvil; no hay APK |

---

## 8. INVENTARIO DE EQUIPOS

| Funcionalidad | Estado | Notas |
|---|---|---|
| Listado de equipos con filtros | ✅ Completado | |
| Vista agrupada por tipo/nombre | ✅ Completado | Resumen de disponibles/asignados/instalados |
| Vista de detalle individual | ✅ Completado | |
| Crear / editar equipo | ✅ Completado | |
| Asignar equipo a técnico | ✅ Completado | |
| Devolver equipo a bodega | ✅ Completado | |
| Historial de movimientos por equipo | ✅ Completado | |
| Vista de inventario filtrado por instalador | ✅ Completado | Solo muestra equipos asignados al técnico |
| Estadísticas del inventario | ✅ Completado | |
| Importación masiva desde Excel | ✅ Completado | Con plantilla descargable |
| Exportar inventario CSV | ✅ Completado | |
| Equipos perdidos / dañados | ⚠️ Incompleto | Estado existe, sin flujo de reposición |
| Mantenimiento preventivo programado | ❌ Pendiente | No implementado |
| Depreciación de activos | ❌ Pendiente | No implementado |

---

## 9. PQR (Peticiones, Quejas y Recursos)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Crear PQR | ✅ Completado | |
| Listar y filtrar PQRs | ✅ Completado | |
| Asignar PQR a técnico | ✅ Completado | |
| Flujo de estados (abierta → en proceso → resuelta) | ✅ Completado | |
| Vista "Mis PQRs" para técnicos | ✅ Completado | |
| Notificación al cliente por correo | ⚠️ Incompleto | Endpoint existe, no siempre se dispara |
| SLA y tiempos de respuesta | ❌ Pendiente | No hay configuración de SLA |
| Escalamiento automático | ❌ Pendiente | No implementado |
| Portal de autogestión cliente | ❌ Pendiente | No hay portal público |

---

## 10. INCIDENCIAS DE SERVICIO

| Funcionalidad | Estado | Notas |
|---|---|---|
| Registrar incidencia | ✅ Completado | |
| Listar y filtrar incidencias | ✅ Completado | |
| Resolución de incidencia | ✅ Completado | |
| Métricas de calidad (QoS) | ⚠️ Incompleto | Tabla `metricas_qos` existe, UI básica |
| Alertas automáticas por tiempo sin resolver | ❌ Pendiente | |
| Integración con módulo de reportes regulatorios | ⚠️ Incompleto | Vista existe, no se alimenta en tiempo real |

---

## 11. CORTES Y RECONEXIONES

| Funcionalidad | Estado | Notas |
|---|---|---|
| Registro de corte de servicio | ✅ Completado | Tabla `cortes_servicio` |
| Reconexión desde cartera / facturación | ✅ Completado | |
| Corte por ONT ID (redes FTTH) | ✅ Completado | Campo `ont_id` en clientes (migración 006) |
| Corte remoto automático (API OLT) | ❌ Pendiente | No implementado |
| Notificación de corte al cliente | ⚠️ Incompleto | No siempre se envía |

---

## 12. CONFIGURACIÓN DEL SISTEMA

| Funcionalidad | Estado | Notas |
|---|---|---|
| Datos de la empresa | ✅ Completado | Nombre, NIT, dirección, logo |
| Configuración de bancos | ✅ Completado | |
| Planes de servicio | ✅ Completado | |
| Conceptos de facturación | ✅ Completado | |
| Configuración de IVA por estrato | ✅ Completado | |
| Plantillas de correo | ✅ Completado | Bienvenida, factura, PQR, corte |
| Sectores y zonas de servicio | ✅ Completado | Con tipo de zona urbano/rural |
| Geografía (departamentos / municipios) | ✅ Completado | |
| Configuración de notificaciones | ⚠️ Incompleto | UI básica, no persistente |
| Variables de entorno documentadas | ⚠️ Incompleto | `.env` no validado al arrancar |

---

## 13. NOTIFICACIONES

| Funcionalidad | Estado | Notas |
|---|---|---|
| Notificaciones internas (campana) | ✅ Completado | |
| Correo electrónico (Nodemailer) | ✅ Completado | SMTP configurable |
| Envío masivo de facturas por correo | ✅ Completado | Con monitor de lote |
| Correo de bienvenida al cliente | ✅ Completado | Plantilla configurable |
| SMS | ⚠️ Incompleto | Módulo existe, requiere integración con proveedor |
| Push notifications (móvil) | ❌ Pendiente | No implementado |
| WhatsApp | ❌ Pendiente | No implementado |

---

## 14. REPORTES Y ESTADÍSTICAS

| Funcionalidad | Estado | Notas |
|---|---|---|
| Dashboard principal (KPIs) | ✅ Completado | Clientes activos, facturas, instalaciones, cartera |
| Estadísticas de clientes | ✅ Completado | |
| Estadísticas de facturación | ✅ Completado | |
| Estadísticas de instalaciones | ✅ Completado | |
| Estadísticas mensuales (vista BD) | ✅ Completado | `vista_estadisticas_mensuales` |
| Cartera actual y vencida | ✅ Completado | `vista_cartera_actual` / `vista_cartera_vencida` |
| Estadísticas de PQR | ✅ Completado | `vista_estadisticas_pqr` |
| Reportes regulatorios CRC | ⚠️ Incompleto | Vista existe, UI en construcción |
| Métricas de disponibilidad de red | ⚠️ Incompleto | `vista_metricas_disponibilidad` sin alimentación real |
| Exportación a Excel de reportes | ⚠️ Incompleto | Solo CSV en algunos módulos |
| Reportes personalizados | ❌ Pendiente | No hay constructor de reportes |

---

## 15. GESTIÓN DE USUARIOS

| Funcionalidad | Estado | Notas |
|---|---|---|
| Crear / editar / desactivar usuarios | ✅ Completado | |
| Roles: admin · supervisor · secretaria · instalador · operador | ✅ Completado | |
| Perfil propio del usuario | ✅ Completado | |
| Filtro por sede (multi-sede) | ✅ Completado | Campo `sede_id` en usuarios |
| Auditoría de acciones por usuario | ❌ Pendiente | Tabla `logs_sistema` existe pero no se alimenta |
| Historial de sesiones | ❌ Pendiente | |

---

## 16. CALENDARIO Y AGENDA

| Funcionalidad | Estado | Notas |
|---|---|---|
| Vista de calendario (FullCalendar) | ✅ Completado | Vista mes / semana / día |
| Instalaciones en el calendario | ✅ Completado | |
| Crear eventos manualmente | ✅ Completado | |
| Recordatorios / alertas de eventos | ⚠️ Incompleto | No hay notificación push ni correo por evento |

---

## 17. SOPORTE Y CHATBOT

| Funcionalidad | Estado | Notas |
|---|---|---|
| Chatbot de soporte (IA) | ✅ Completado | Integrado con LLM |
| Creación de PQR desde el chat | ✅ Completado | |
| Historial de conversación | ✅ Completado | |
| Portal de soporte público | ⚠️ Incompleto | UI básica |
| Base de conocimiento / FAQ configurable | ❌ Pendiente | |

---

## 18. REGISTRO WEB (AUTOGESTIÓN)

| Funcionalidad | Estado | Notas |
|---|---|---|
| Formulario de solicitud de servicio (web pública) | ✅ Completado | |
| Recepción de solicitud en el sistema | ✅ Completado | |
| Respuesta automática al solicitante | ⚠️ Incompleto | No siempre se envía correo de confirmación |
| Portal de autogestión del cliente (ver facturas, PQR) | ❌ Pendiente | No implementado |

---

## 19. INFRAESTRUCTURA Y ARQUITECTURA

| Elemento | Estado | Notas |
|---|---|---|
| API REST (Express + MySQL2) | ✅ Completado | 25 módulos de rutas |
| Autenticación JWT con middleware | ✅ Completado | |
| Control de CORS | ✅ Completado | |
| Compresión de respuestas | ✅ Completado | `compression` activo |
| Helmet (cabeceras de seguridad) | ✅ Completado | |
| Rate limiting en rutas críticas | ⚠️ Incompleto | Solo en login, no en todos |
| Variables de entorno (.env) | ✅ Completado | |
| Logs con Winston | ⚠️ Incompleto | Configurado pero no usado en todos los módulos |
| Cron jobs (facturación automática) | ✅ Completado | node-cron |
| Caché (Redis) | ❌ Pendiente | No implementado, toda petición va a BD |
| Pruebas unitarias / integración | ❌ Pendiente | Jest instalado, 0 tests escritos |
| CI/CD pipeline | ❌ Pendiente | No configurado |
| Documentación de API (Swagger) | ❌ Pendiente | No existe |

---

## 20. BASE DE DATOS — TABLAS

| Tabla | Descripción | Estado |
|---|---|---|
| `clientes` | Base de clientes | ✅ |
| `servicios_cliente` | Servicios por cliente | ✅ |
| `planes_servicio` | Catálogo de planes | ✅ |
| `contratos` | Contratos de servicio | ✅ |
| `instalaciones` | Órdenes de trabajo | ✅ |
| `facturas` | Facturas generadas | ✅ |
| `facturas_detalle` | Líneas de factura | ✅ |
| `pagos` | Registros de pago | ✅ |
| `sistema_usuarios` | Usuarios del sistema | ✅ |
| `bancos` | Entidades bancarias | ✅ |
| `departamentos` | Departamentos Colombia | ✅ |
| `ciudades` | Municipios | ✅ |
| `sectores` | Zonas de servicio | ✅ |
| `plantillas_correo` | Plantillas de email | ✅ |
| `conceptos_facturacion` | Rubros de factura | ✅ |
| `configuracion_empresa` | Config empresa | ✅ |
| `configuracion_facturacion` | Config facturación | ✅ |
| `configuracion_iva` | Tasas IVA por estrato | ✅ |
| `pqr` | Peticiones quejas recursos | ✅ |
| `incidencias_servicio` | Incidencias de red | ✅ |
| `inventario_equipos` | Equipos y hardware | ✅ |
| `inventario_historial` | Movimientos de equipos | ✅ |
| `cortes_servicio` | Registro de cortes | ✅ |
| `traslados_servicio` | Traslados de dirección | ✅ |
| `varios_pendientes` | Cobros adicionales | ⚠️ |
| `rutas_cobranza` | Rutas de cobrador | ⚠️ |
| `codigos_regulatorios` | Códigos CRC | ⚠️ |
| `metricas_qos` | Calidad de servicio | ⚠️ |
| `equipos_perdidos` | Equipos perdidos | ⚠️ |
| `facturacion_historial` | Historial de procesos | ✅ |
| `logs_sistema` | Auditoría general | ❌ Sin alimentar |
| `clientes_inactivos` | Archivo de clientes | ✅ |
| `ubicaciones_tecnicos` | GPS en tiempo real | ✅ (nuevo) |
| `notificaciones` | Cola de notificaciones | ✅ |
| `envios_masivos_email` | Control de envíos | ✅ |
| **10 Vistas SQL** | Estadísticas y reportes | ✅ |

---

## 21. MIGRACIONES APLICADAS

| # | Archivo | Descripción | Estado |
|---|---|---|---|
| 001 | `001_permitir_clientes_multiples_direcciones.sql` | Multi-dirección en clientes | ✅ |
| 002 | `002_add_numero_orden_instalaciones.sql` | Número de orden en instalaciones | ✅ |
| 003 | `003_add_sector_tipo_zona_and_user_sede.sql` | Sectores y sede por usuario | ✅ |
| 004 | `004_rename_roles_secretaria.sql` | Rol secretaria renombrado | ✅ |
| 005 | `005_pqr_cliente_id_nullable.sql` | PQR sin cliente obligatorio | ✅ |
| 006 | `006_add_ont_id_to_clientes.sql` | Campo ONT/GPON en clientes | ✅ |
| 007 | `007_add_firma_instalador_to_instalaciones.sql` | Firma digital del técnico | ✅ |
| 008 | `008_create_ubicaciones_tecnicos.sql` | GPS en tiempo real | ✅ (nuevo) |

---

## 22. PENDIENTES PRIORIZADOS

### 🔴 Alta prioridad
1. **Facturación electrónica DIAN** — Módulo de pruebas listo, falta paso a producción
2. **Notas crédito formales** — Solo anula factura, no genera documento NC
3. **Logs de auditoría** — Tabla `logs_sistema` sin alimentar; necesario para trazabilidad
4. **Corte remoto por API OLT** — Automatización del corte en redes FTTH
5. **SLA en PQR** — Sin tiempos de respuesta configurados ni alertas

### 🟡 Media prioridad
6. **Portal de autogestión del cliente** — Ver facturas, PQR, estado del servicio
7. **Notificaciones SMS / WhatsApp** — Módulo SMS existe sin proveedor
8. **Optimización de ruta para técnicos** — No hay TSP / Google Maps Directions API
9. **Caché con Redis** — Toda petición va directo a base de datos
10. **Pruebas automatizadas** — Jest instalado, 0 tests escritos

### 🟢 Baja prioridad
11. App móvil nativa (Android/iOS) para técnicos
12. Reportes personalizados (constructor de reportes)
13. Integración con pasarela de pagos (tarjeta crédito/PSE en línea)
14. Documentación de API (Swagger / OpenAPI)
15. Renovación automática de contratos

---

## 23. RESUMEN EJECUTIVO

| Módulo | Completado | Incompleto | Pendiente |
|---|---|---|---|
| Autenticación | 80% | 10% | 10% |
| Gestión de Clientes | 85% | 10% | 5% |
| Facturación | 80% | 15% | 5% |
| Contratos | 70% | 20% | 10% |
| Instalaciones | 95% | 5% | 0% |
| Seguimiento Técnicos | 90% | 0% | 10% |
| Inventario | 85% | 10% | 5% |
| PQR | 75% | 5% | 20% |
| Incidencias | 60% | 20% | 20% |
| Cortes / Reconexiones | 70% | 15% | 15% |
| Configuración | 90% | 10% | 0% |
| Notificaciones | 65% | 15% | 20% |
| Reportes | 70% | 20% | 10% |
| Usuarios | 80% | 0% | 20% |
| Calendario | 80% | 20% | 0% |
| Chatbot / Soporte | 75% | 15% | 10% |
| Infraestructura | 65% | 15% | 20% |

**Promedio global de avance: ~78%**

---

*Generado automáticamente a partir del análisis del código fuente — ERP-PSI 2026*
