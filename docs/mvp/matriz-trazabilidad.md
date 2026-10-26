# Matriz de trazabilidad del MVP

Estado revisado al cierre de las fases 0–6. “Implementado” indica una pieza verificable del requisito dentro del alcance del MVP. “Parcial” indica que falta parte del requisito del informe. “Diferido” conserva una brecha explícita.

| ID | Requisito | Estado | Evidencia y límite vigente |
|---|---|---|---|
| RF01 | Dashboard ejecutivo: proyectos, rentabilidad, facturación y capacidad | Parcial | [ManagedDashboard.tsx](../../frontend/src/modules/dashboard/ManagedDashboard.tsx); inventario, hallazgos, contratos, horas estimadas y facturas; sin rentabilidad ni capacidad. |
| RF02 | Exportar informes financieros y operativos a PDF y Excel | Parcial | [reports/service.ts](../../backend/src/modules/reports/service.ts); Excel de activos, hallazgos y cartera; PDF diferido. |
| RF03 | Perfil único de cliente accesible en las sedes | Parcial | [service-contracts/repository.ts](../../backend/src/modules/service-contracts/repository.ts); resumen 360 por cliente; no hay replicación multi-sede. |
| RF04 | Historial completo del cliente: contratos, proyectos y cartera | Parcial | [ClientOverviewPage.tsx](../../frontend/src/modules/clients/ClientOverviewPage.tsx); muestra sedes, inventario agregado, contratos, proyectos, hallazgos y cartera. |
| RF05 | Oportunidades comerciales y fecha estimada de cierre | Diferido | Sin entidad CRM de oportunidades. |
| RF06 | Proyectos con etapas, tareas, responsables y fechas | Parcial | [project.repository.ts](../../backend/src/repositories/project.repository.ts) y hitos; sin tareas y etapas completas. |
| RF07 | Avance casi en tiempo real y alertas de plazo | Parcial | Porcentaje de avance manual; sin actualización en vivo ni alertas de plazo. |
| RF08 | Horas de técnicos comparadas con estimaciones | Parcial | [work/service.ts](../../backend/src/modules/work/service.ts); registro de horas y alerta al pasar 90%; sin planificación de capacidad. |
| RF09 | Alertas de riesgo de plazo, presupuesto o capacidad | Parcial | Solo alerta de umbral de horas; riesgos de fecha, presupuesto y capacidad diferidos. |
| RF10 | Facturación al cerrar hitos o por recurrencia | Parcial | [billing/service.ts](../../backend/src/modules/billing/service.ts); cierre de hito crea factura en borrador; recurrencia diferida. |
| RF11 | Factura electrónica legal mediante proveedor autorizado | Diferido | Adaptador `SIMULATED_ACCEPTED`; no integra DIAN ni afirma validez fiscal. |
| RF12 | Cartera por rangos de antigüedad y cliente/sede | Parcial | Vista `v_receivables_aging` y pantalla de cartera; sin agrupación por sede. |
| RF13 | Auditoría de cambios de facturas emitidas | Implementado | Cambios de estado de factura registrados en `audit_log`. |
| RF14 | Calendario de disponibilidad y asignación de equipo | Diferido | No hay calendario de capacidad. |
| RF15 | Consultar disponibilidad por rol y habilidades | Diferido | No hay catálogo de habilidades ni cálculo de disponibilidad. |
| RF16 | Detectar o bloquear doble asignación | Diferido | No hay planificador de recursos. |
| RF17 | Monitorear conectividad entre sedes y nube | Parcial | [network-domain.md](../architecture/network-domain.md); topología estática y simulación de caída; sin telemetría en vivo. |
| RF18 | Administrar políticas ZTNA por usuario, rol y servicio | Diferido | Sin ZTNA. |
| RF19 | Registrar cada login exitoso/fallido con usuario, sede y dispositivo | Parcial | [auth.controller.ts](../../backend/src/controllers/auth.controller.ts); persiste éxito/fallo, IP y user agent; sede no se identifica. |
| RNF01 | SSO y MFA para todos los accesos | Diferido | MFA TOTP y SSO requieren identidad/proveedor externo. |
| RNF02 | Autorización estricta por rol en módulos | Parcial | [routes/index.ts](../../backend/src/routes/index.ts) y guardas por módulo; matriz principal aplicada, falta cobertura integral automatizada de todas las rutas. |
| RNF03 | Cifrado en tránsito y reposo | Diferido | Cookie `Secure` en producción; despliegue TLS y cifrado de almacenamiento no están configurados aquí. |
| RNF04 | Operaciones diarias en menos de 2 s | Diferido | Sin pruebas de rendimiento. |
| RNF05 | Dashboard actualizado en menos de 5 min | Diferido | No hay refresco programado ni métrica de frescura. |
| RNF06 | Crecimiento de datos sin degradar respuesta | Parcial | Paginación e índices; sin benchmark. |
| RNF07 | Disponibilidad continua mensual para ambas sedes | Diferido | Sin plataforma, monitoreo de disponibilidad o SLA. |
| RNF08 | Fallo de un módulo no derriba los demás | Parcial | Aislamiento modular; no se implementó circuit breaker ni bulkhead porque no hay llamada externa operativa que proteger. |
| RNF09 | UI adaptable a escritorio y móvil | Parcial | Estilos responsivos existentes; no hay prueba visual exhaustiva de todas las páginas nuevas. |
| RNF10 | Tareas intuitivas sin capacitación técnica extensa | Parcial | Interfaz en español; no se hicieron pruebas de usabilidad. |
| HU-01 | Capacidad y asignación de recursos | Diferido | Solo se asignan OT a técnicos; sin capacidad, calendario ni planificación. |
| HU-02 | Dashboard ejecutivo y exportación PDF/Excel | Parcial | Dashboard operativo y exportación Excel; PDF y rentabilidad diferidos. |
| HU-03 | Facturación electrónica automática por hito | Parcial | Hito crea factura y el proveedor simulado devuelve `SIMULATED_ACCEPTED`; no es factura electrónica legal. |
| HU-04 | Cartera unificada con antigüedad | Parcial | Rangos 0–30, 31–60, 61–90 y >90 por cliente; sin sede. |
| HU-05 | Acceso seguro con SSO, MFA y ZTNA | Parcial | Roles, eventos, sesiones persistentes y Origin; SSO, MFA y ZTNA diferidos. |
| HU-06 | Etapas, horas y riesgos del proyecto | Parcial | Hitos, OT, horas y alerta al 90%; sin tareas/riesgo de cronograma y capacidad. |
| HU-07 | Monitoreo de conectividad y disponibilidad | Parcial | Inventario y grafo estático con simulación; sin disponibilidad ni failover real. |
| HU-08 | Perfil único e historial del cliente | Parcial | Vista 360 con datos del corte vertical; oportunidades e historial CRM ampliado diferidos. |

## Validación ejecutada

- Backend TypeScript compila.
- Suite backend pasa; incluye normalizadores, permisos, reglas de dominio y el grafo contra un grafo pequeño y la topología Excel real.
- Frontend TypeScript y Vite compilan.
- No se crearon pruebas transaccionales contra PostgreSQL ni se verificó la doble aplicación de scripts; ambas siguen pendientes hasta contar con una base de pruebas limpia y separada. La base local identificada no está limpia, así que no se modificó.
