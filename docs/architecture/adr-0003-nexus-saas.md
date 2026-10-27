# ADR-0003: Nexus Safe-Cloud como producto SaaS

- Estado: aceptada por solicitud del usuario.
- Fecha: 2026-10-27.
- Alcance: modelo de negocio y experiencia del ERP.

## Contexto

La empresa Nexus Safe-Cloud se presenta como una empresa SaaS que ofrece software de observabilidad y operación de redes. Los Excel técnicos describen una infraestructura de red y una captura puntual, pero no identifican clientes pagadores, ingresos, suscripciones ni transacciones contables reales.

## Decisión

El ERP modela el ciclo SaaS: prospección comercial, clientes, planes, suscripciones mensuales/anuales, ingresos recurrentes, gastos de operación, compras, contabilidad gerencial, proyectos de implementación y soporte técnico. Las sedes y activos de la fuente se conservan como contexto técnico de una muestra, no como prueba de una operación comercial vigente.

Los registros de demo usan valores plausibles y relaciones funcionales desde el año actual. El campo de procedencia se conserva internamente para auditoría, carga repetible y limpieza segura, pero no se presenta en las pantallas de negocio. No se afirma que los clientes, ventas, suscripciones, compras o asientos generados correspondan a transacciones reales.

## Límites

- La facturación electrónica no se conecta con DIAN ni con un proveedor autorizado.
- El módulo contable es gerencial y no sustituye libros reglamentarios, impuestos ni cierre local.
- El módulo de talento mantiene un directorio corporativo; nómina y obligaciones laborales quedan fuera del alcance.
- La captura IoT no es telemetría en vivo; disponibilidad y SLA requieren una integración de colectores.
