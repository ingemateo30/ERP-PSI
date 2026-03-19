# ERP-PSI — Roadmap de Desarrollo

Sistema de gestión para ISP (Proveedor de Servicios de Internet).

---

## ✅ Fase 1 — Bugs Críticos (Completado)

| # | Ítem | Estado |
|---|------|--------|
| 7 | Arreglar error del servidor al eliminar cliente | ✅ Completado |
| 11 | IP no requerida para instalaciones solo-TV o revisiones | ✅ Completado |
| 6 | Técnico ve solo su inventario asignado | ✅ Completado |

---

## ✅ Fase 2 — Mejoras de UI y Flujo (Completado)

| # | Ítem | Estado |
|---|------|--------|
| 16 | Todos los campos monetarios en pesos colombianos (COP) sin centavos | ✅ Completado |
| 1 | Listar barrios por ciudad al crear cliente (select con buscador) | ✅ Completado |
| 2 | Auto-generar código de sector secuencialmente por ciudad | ✅ Completado |
| 5 | Mostrar instaladores de la misma sede primero al asignar | ✅ Completado |
| — | Botón "Asignar Instalador" visible para rol secretaria | ✅ Completado |
| — | Eliminar cliente: hard delete si < 5 días y sin pagos | ✅ Completado |
| — | Campo permanencia/instalación sin pérdida de foco al editar | ✅ Completado |
| — | Campo barrio deshabilitado hasta seleccionar ciudad | ✅ Completado |

---

## ✅ Fase 3 — Lógica de Negocio (Completado)

| # | Ítem | Estado |
|---|------|--------|
| 3 | Renovación de contrato solo cuando está próximo a vencer | ✅ Completado |
| 8 | Bloquear retiro de servicio hasta que el contrato expire | ✅ Completado |
| 9 | Firma Wacom en contratos | ✅ Completado |
| 13 | Filtrado por sede en todas las vistas para técnicos/secretarias | ✅ Completado |
| 19 | Panel de cartera morosa (clientes con 2+ facturas vencidas) | ✅ Completado |
| 20 | Formulario de edición de cliente corregido | ✅ Completado |

---

## 🔄 Fase 4 — Técnica (Pendiente)

| # | Ítem | Descripción |
|---|------|-------------|
| 10 | Separar campos Efecty y PSE en conciliación de pagos | Dos campos independientes en el formulario de reconciliación |
| 12 | Reemplazar lógica de IP con MAC/ONT para corte de servicio | Usar dirección MAC u ONT en lugar de IP para gestionar cortes |
| 14 | Firma del técnico guardada e insertada en PDF | Capturar y almacenar firma del técnico, incluirla en documentos generados |

---

## 🔄 Fase 5 — Nuevas Funcionalidades (Pendiente)

| # | Ítem | Descripción |
|---|------|-------------|
| 4 | Seguimiento de ubicación de técnico + control de agenda + ruta diaria (Google Maps) | Panel de supervisión de técnicos en tiempo real con rutas optimizadas |
| 15 | PQR asignable a técnicos con flujo completo de resolución | Técnicos reciben, gestionan y cierran PQR desde su app |
| 17 | Notificaciones push vía SMS usando LabsMobile | Integración con API LabsMobile para envío de SMS a clientes y técnicos |

---

## 💡 Fase 6 — Ideas Adicionales (Backlog)

- Portal de autogestión para clientes (ver facturas, reportar averías)
- Dashboard de métricas en tiempo real para administradores
- Exportación de reportes en PDF (cartera, instalaciones, PQR)
- Integración con pasarela de pagos en línea
- App móvil para técnicos (PWA o React Native)
- Sistema de inventario con alertas de stock bajo

---

## Convenciones de Ramas

- Desarrollo: `claude/<descripcion>-<sessionId>`
- Producción: `main`
- Nunca hacer push directo a `main`
