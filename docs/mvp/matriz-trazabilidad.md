# Matriz de trazabilidad del MVP

Estado inicial basado en el repositorio y la línea base del 2026-10-25. Se actualizará al cierre de cada fase. “Parcial” significa que hay una pieza funcional, pero no se cumplen todos los criterios del requisito.

| ID | Requisito resumido | Estado inicial | Evidencia / brecha |
|---|---|---|---|
| RF01 | Dashboard ejecutivo: proyectos, rentabilidad, facturación y capacidad | Parcial | [DashboardPage.tsx](../../frontend/src/modules/dashboard/DashboardPage.tsx); solo datos básicos de proyectos/clientes. |
| RF02 | Exportar informes financieros y operativos a PDF y Excel | Diferido | Sin exportación. |
| RF03 | Perfil único de cliente accesible en las sedes | Parcial | [client.repository.ts](../../backend/src/repositories/client.repository.ts); NIT normalizado, sin cliente 360/aislamiento por sede. |
| RF04 | Historial completo del cliente: contratos, proyectos y cartera | Diferido | No existe overview 360 ni entidades de contrato/cartera. |
| RF05 | Oportunidades comerciales y fecha estimada de cierre | Diferido | Sin módulo CRM de oportunidades. |
| RF06 | Proyectos con etapas, tareas, responsables y fechas | Parcial | [project.repository.ts](../../backend/src/repositories/project.repository.ts); entidad de proyecto sin etapas/tareas. |
| RF07 | Avance casi en tiempo real y alertas de plazo | Parcial | Hay porcentaje de avance; sin actualización en tiempo real ni alertas de plazo. |
| RF08 | Horas de técnicos comparadas con estimaciones | Diferido | Sin órdenes de trabajo ni horas. |
| RF09 | Alertas de riesgo de plazo, presupuesto o capacidad | Diferido | Sin motor de alertas. |
| RF10 | Facturación al cerrar hitos o por recurrencia | Diferido | Sin hitos/facturas. |
| RF11 | Factura electrónica legal mediante proveedor autorizado | Diferido | No hay integración; se prevé adaptador simulado en el alcance MVP. |
| RF12 | Cartera por rangos de antigüedad y cliente/sede | Diferido | Sin cartera. |
| RF13 | Auditoría de cambios de facturas emitidas | Diferido | No hay facturas; la auditoría actual solo cubre red. |
| RF14 | Calendario de disponibilidad y asignación de equipo | Diferido | Sin capacidad/recursos. |
| RF15 | Consultar disponibilidad por rol y habilidades | Diferido | Sin habilidades ni capacidad. |
| RF16 | Detectar o bloquear doble asignación | Diferido | Sin planificación de recursos. |
| RF17 | Monitorear conectividad entre sedes y nube | Parcial | [network-domain.md](../architecture/network-domain.md); inventario y topología estática, sin telemetría en vivo. |
| RF18 | Administrar políticas ZTNA por usuario, rol y servicio | Diferido | Sin ZTNA. |
| RF19 | Registrar cada login exitoso/fallido con usuario, sede y dispositivo | Diferido | [auth.controller.ts](../../backend/src/controllers/auth.controller.ts); autentica, pero no persiste intentos. |
| RNF01 | SSO y MFA para todos los accesos | Diferido | No hay IdP/SSO/MFA. |
| RNF02 | Autorización estricta por rol en módulos | Parcial | [auth.ts](../../backend/src/shared/auth.ts); hay RBAC inicial, no la matriz completa del informe. |
| RNF03 | Cifrado en tránsito y reposo | Diferido | No verificable en la configuración de despliegue del repositorio. |
| RNF04 | Operaciones diarias en menos de 2 s | Diferido | No hay pruebas de rendimiento. |
| RNF05 | Dashboard actualizado en menos de 5 min | Diferido | Sin refresh periódico ni métricas de frescura. |
| RNF06 | Crecimiento de datos sin degradar respuesta | Parcial | Paginación añadida; sin benchmark/plan de escalado validado. |
| RNF07 | Disponibilidad continua mensual para ambas sedes | Diferido | Sin infraestructura/SLA/RTO/RPO verificables. |
| RNF08 | Fallo de un módulo no derriba los demás | Diferido | Monolito modular sin circuit breaker/bulkhead. |
| RNF09 | UI adaptable a escritorio y móvil | Parcial | Hay media queries en [styles.css](../../frontend/src/app/styles.css); no hay validación de todas las vistas. |
| RNF10 | Tareas intuitivas sin capacitación técnica extensa | Parcial | UI localizada en español; sin pruebas de usabilidad. |
| HU-01 | Capacidad y asignación de recursos | Diferido | Sin recursos, calendario ni alertas de sobreasignación. |
| HU-02 | Dashboard ejecutivo y exportación PDF/Excel | Parcial | Dashboard básico; exportación y KPIs financieros faltantes. |
| HU-03 | Facturación electrónica automática por hito | Diferido | Sin hitos/facturación. |
| HU-04 | Cartera unificada con antigüedad | Diferido | Sin cartera. |
| HU-05 | Acceso seguro con SSO, MFA y ZTNA | Diferido | Sin SSO/MFA/ZTNA. |
| HU-06 | Etapas, horas y riesgos del proyecto | Parcial | Proyectos/avance existen; faltan etapas, tareas, horas y riesgo. |
| HU-07 | Monitoreo de conectividad y disponibilidad | Parcial | Inventario estático; sin alertas ni failover. |
| HU-08 | Perfil único e historial del cliente | Parcial | CRM base y unicidad de NIT; faltan contratos, oportunidades e historial 360. |

