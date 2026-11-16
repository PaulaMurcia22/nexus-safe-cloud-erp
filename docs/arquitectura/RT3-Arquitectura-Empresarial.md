# Requisito Técnico 3. Arquitectura Empresarial y Alineación Estratégica

## 1. Propósito y continuidad con el RT1

El RT1 explicó cómo se organiza técnicamente la solución: un monolito modular, comunicación REST, RabbitMQ para eventos y una fuente centralizada de información. El presente requisito parte de esa base y analiza cómo dicha arquitectura responde a las necesidades estratégicas de Nexus Safe-Cloud.

Aquí no se repite la descripción técnica del RT1. El objetivo es relacionar cada problema empresarial con una capacidad, un subsistema y un resultado esperado, utilizando TOGAF ADM como marco de organización.

La solución busca mejorar la visibilidad del negocio, reducir reprocesos, controlar proyectos y recursos, fortalecer la gestión de facturación y proteger la información centralizada.

## 2. ¿Qué es TOGAF ADM y cómo se aplica?

TOGAF ADM es un método para diseñar y gobernar una arquitectura empresarial de manera ordenada. No se limita a describir tecnologías: comienza con las necesidades del negocio, define una visión, organiza las capacidades y después relaciona los datos, las aplicaciones y la tecnología que permiten alcanzar esa visión.

Las fases se entienden así:

- **Fase preliminar:** define alcance, principios, responsables y gobierno de la arquitectura.
- **Fase A – Visión de arquitectura:** establece la situación objetivo y los objetivos que debe apoyar la solución.
- **Fase B – Arquitectura de negocio:** identifica procesos, actores y capacidades empresariales.
- **Fase C – Arquitectura de sistemas de información:** organiza los datos y aplicaciones que soportan el negocio.
- **Fase D – Arquitectura tecnológica:** define infraestructura, plataformas, redes, seguridad y servicios técnicos.
- **Fase E – Oportunidades y soluciones:** identifica brechas e iniciativas para pasar de la situación actual a la futura.
- **Fase F – Planificación de la migración:** ordena iniciativas, dependencias, prioridades y etapas de implementación.

En Nexus, estas fases se utilizan como guía para conectar los problemas empresariales con la solución ERP. Esto no significa que se haya ejecutado un ciclo formal completo de TOGAF ni que todas las fases estén cerradas.

### Aplicación de las fases en Nexus

Se define como principio una fuente única y confiable para la información empresarial. También se establece que las capacidades de negocio deben diferenciarse de los módulos de software y que la evolución tecnológica debe ser progresiva.

### Fase A: Visión de arquitectura

La visión consiste en consolidar la operación comercial, técnica y financiera en un ERP común para Medellín, Bogotá y los colaboradores remotos.

### Fase B: Arquitectura de negocio

Se identifican las capacidades empresariales, los procesos y los responsables que utilizan la solución.

### Fase C: Sistemas de información

Se organizan los datos compartidos y las aplicaciones que los producen o consumen. PostgreSQL funciona como la fuente central de las transacciones del ERP.

### Fase D: Arquitectura tecnológica

Se describen Docker, PostgreSQL, RabbitMQ, la API, el frontend y la arquitectura cloud objetivo en Azure.

### Fases E y F: Evolución y migración

La transición debe ser incremental: primero se estabiliza el monolito modular y luego se separan servicios únicamente si existe una necesidad real de carga, autonomía o seguridad.

## 3. Matriz de trazabilidad: dolores y mitigación

La siguiente matriz muestra los dolores del negocio que aparecen en el pliego y en los cortes anteriores, pero únicamente incluye aquellos para los que la solución ya aporta algún mecanismo de atención. La relación no significa que el problema desaparezca automáticamente: muestra cómo una capacidad o componente contribuye a reducirlo.

| Dolor empresarial | Qué se implementó para reducirlo | Cómo contribuye la solución | Capacidad y subsistemas |
|---|---|---|---|
| Información duplicada o contradictoria entre sedes | PostgreSQL centralizado, relaciones entre módulos y una aplicación común | Todos consultan y actualizan una misma fuente, reduciendo copias y diferencias entre archivos | Gobierno de datos; Clientes, Proyectos, Facturación, Recursos y Redes |
| Falta de visibilidad del estado de proyectos | Registro de proyectos, responsables, estados, avances e información consultable | Permite consultar avance y responsables desde el ERP, sin depender de archivos separados | Gestión de proyectos; Proyectos, Contratos y Reportes |
| Falta de visibilidad de rentabilidad | Existen proyectos, horas, facturas, gastos y registros contables | Reúne los datos necesarios para relacionar ingresos, esfuerzo y costos por proyecto | Desempeño de proyectos; Proyectos, Recursos, Facturación, Compras y Contabilidad |
| Compromisos comerciales sin conocer la capacidad técnica | Existen responsables, órdenes de trabajo y horas registradas | Aporta información para comparar trabajo asignado con capacidad registrada | Recursos y capacidad; CRM, Proyectos, Recursos y Personas |
| Errores de facturación | Existen clientes, contratos, proyectos, hitos, facturas y controles de auditoría | Relaciona la facturación con el cliente y el servicio, reduciendo digitación y reprocesos | Facturación y cartera; Facturación, Contratos y Proyectos |
| Cartera vencida y seguimiento incompleto | Existen facturas, pagos, estados y consulta de antigüedad de saldos | Organiza la cartera y permite priorizar el seguimiento de pagos | Gestión de cartera; Facturación y Reportes |
| Accesos no controlados | Existen usuarios, sesiones, roles, permisos y controles del backend | Limita el acceso según el usuario y permite atribuir las operaciones realizadas | Identidad y seguridad; Auth, Users y todos los módulos |
| Falta de visibilidad de infraestructura | Existen inventario, sitios, enlaces, VLAN, topología y hallazgos | Centraliza la información técnica para consultar activos y riesgos desde el ERP | Gestión de redes; Redes y Operación |

La matriz demuestra que la tecnología no resuelve por sí sola todos los dolores. También se necesitan reglas de negocio, responsables de los datos, procesos de trabajo y validación con las áreas de Nexus.

## 4. Capacidades empresariales

Una capacidad empresarial representa algo que la empresa necesita poder hacer. No es lo mismo que una pantalla o una función del sistema.

### 4.1. Gestión de clientes y oportunidades

Permite mantener un perfil común del cliente, consultar su relación con la empresa y dar seguimiento a oportunidades comerciales.

### 4.2. Gestión de contratos y servicios

Relaciona clientes, contratos, alcance del servicio, proyectos y condiciones de atención.

### 4.3. Gestión de proyectos

Permite organizar proyectos, responsables, estados, avances, hitos y compromisos.

### 4.4. Gestión de recursos y capacidad

Permite conocer qué personas participan en los proyectos, qué órdenes tienen asignadas y cuántas horas registran.

### 4.5. Facturación y cartera

Permite consultar facturas, pagos, estados y antigüedad de saldos.

### 4.6. Gestión financiera y reportes

Relaciona gastos, compras, facturas y reportes para apoyar las decisiones de la gerencia.

### 4.7. Gestión de infraestructura y redes

Permite administrar activos, sitios, enlaces, VLAN, topología y hallazgos técnicos.

### 4.8. Identidad y seguridad

Permite controlar usuarios, roles, sesiones y permisos para que cada persona acceda únicamente a la información que necesita.

### 4.9. Gobierno y calidad de datos

Permite definir quién es responsable de cada dato, cómo se corrigen errores y cómo se evita que se creen registros duplicados.

## 5. Arquitectura de datos

La arquitectura de datos se basa en una base PostgreSQL centralizada. Los módulos utilizan información común sobre clientes, proyectos, contratos, recursos, facturas, pagos, gastos, activos y usuarios.

Esto significa que no se propone que cada sede tenga un archivo o base independiente. Medellín, Bogotá y los colaboradores remotos consultarían la misma información mediante la aplicación.

| Información | Quién la utiliza | Propósito |
|---|---|---|
| Clientes | Comercial, Proyectos y Facturación | Mantener una referencia común del cliente |
| Proyectos | Proyectos, Recursos, Facturación y Reportes | Relacionar avance, horas, hitos e ingresos |
| Contratos | Comercial, Proyectos y Facturación | Conocer el alcance y las condiciones del servicio |
| Recursos y horas | Recursos, Proyectos y Reportes | Controlar trabajo y capacidad |
| Facturas y pagos | Facturación, Gerencia y Reportes | Controlar ingresos y cartera |
| Gastos y compras | Finanzas y Reportes | Apoyar el control administrativo |
| Activos de red | Redes, Operación y Contratos | Relacionar infraestructura y servicios |
| Usuarios y permisos | Todos los módulos | Controlar el acceso a la información |

La base central evita que un módulo trabaje con una copia diferente de los datos. Las reglas de integridad, los permisos y los procesos de revisión son necesarios para mantener la calidad de la información.

## 6. Arquitectura de aplicaciones

El sistema utiliza un monolito modular. Esto significa que existe un backend único, pero sus responsabilidades están organizadas por módulos.

- Proyectos administra proyectos y avances.
- Facturación administra facturas, pagos y cartera.
- Recursos administra órdenes y horas.
- Redes administra infraestructura y topología.
- Auth y Users administran usuarios, sesiones y permisos.
- Reportes y dashboard presentan información consolidada.

La comunicación normal entre el frontend y el backend es REST. Para el evento de creación de proyectos se utiliza RabbitMQ. Esta mensajería no reemplaza todas las operaciones REST; se aplica únicamente cuando el procesamiento posterior aporta valor.

La integración actual entre Proyectos y Facturación es técnica. Facturación recibe y registra el evento, pero no crea automáticamente facturas o hitos porque el evento no contiene información comercial suficiente.

## 7. Arquitectura tecnológica

La arquitectura actual y la propuesta de evolución se resumen así:

| Componente | Situación actual | Situación objetivo |
|---|---|---|
| Frontend | React/Vite | Aplicación web desplegada en cloud |
| Backend | Express/TypeScript modular | Contenedor escalable |
| Base de datos | PostgreSQL en Docker | PostgreSQL administrado en Azure |
| Mensajería | RabbitMQ integrado localmente | Broker administrado o desplegado según decisión del equipo |
| Despliegue | Docker Compose | Azure Container Apps u otra alternativa validada |
| Registro de imágenes | Local | Azure Container Registry |
| Logs | Logs locales | Monitorización cloud |
| Seguridad | Roles, sesiones y controles del backend | HTTPS, secretos, identidad y controles cloud |

Azure, la alta disponibilidad, el failover y la escalabilidad cloud deben presentarse como arquitectura objetivo hasta contar con evidencia de despliegue y pruebas.

## 8. Impacto esperado en rentabilidad y control financiero

La arquitectura propuesta contribuye al control financiero de Nexus Safe-Cloud al integrar en una misma plataforma la información de clientes, contratos, proyectos, recursos, horas, facturas, pagos, compras y gastos.

Esta integración permite relacionar la operación diaria con la información financiera de la empresa. Los proyectos pueden asociarse con sus responsables, horas trabajadas, contratos, hitos y facturas, facilitando el seguimiento de los compromisos adquiridos y de los ingresos relacionados con cada servicio.

La gestión de recursos y horas permite conocer el esfuerzo utilizado en los proyectos y comparar el trabajo realizado con la planificación establecida. Esto facilita la identificación de desviaciones, el seguimiento de la carga operativa y la toma de decisiones sobre la asignación del equipo técnico.

El módulo de Facturación centraliza las facturas, pagos, estados y saldos pendientes. La información de cartera permite organizar las obligaciones por antigüedad y realizar un seguimiento más ordenado de los pagos. De esta manera, el área financiera puede consultar la situación de los clientes y priorizar las actividades de recaudo.

La relación entre contratos, proyectos, hitos y facturas también contribuye a reducir errores y reprocesos administrativos. La información se registra una vez y puede ser utilizada por los módulos que la necesitan, evitando depender de archivos separados o de la digitación repetida de los mismos datos.

La gestión de compras, gastos y registros contables complementa la información de ingresos y permite consolidar los movimientos financieros de la empresa. Esto facilita que la gerencia consulte información operativa y financiera desde una misma plataforma para apoyar sus decisiones.

En conjunto, la solución contribuye a:
- Mejorar la visibilidad de ingresos, gastos, proyectos y cartera.
- Relacionar el trabajo realizado con los servicios contratados.
- Facilitar el seguimiento de horas y recursos utilizados.
- Reducir errores derivados de información duplicada.
- Mejorar el control de facturas y pagos.
- Centralizar la información necesaria para analizar los resultados de los proyectos.
- Proporcionar información consolidada para la toma de decisiones gerenciales.
- Fortalecer la trazabilidad de las operaciones financieras y administrativas.

Por lo tanto, la arquitectura empresarial alinea los módulos tecnológicos con los objetivos estratégicos de Nexus Safe-Cloud: mejorar el control de la operación, reducir reprocesos, fortalecer la gestión financiera y contar con información confiable para dirigir la compañía.

## 10. Consistencia de la propuesta

La propuesta es coherente con el estado actual del proyecto porque:

- Mantiene el monolito modular.
- Utiliza PostgreSQL como fuente central.
- Usa REST para operaciones inmediatas.
- Usa RabbitMQ para un evento asíncrono concreto.
- No presenta microservicios como si ya existieran.
- No afirma que exista replicación entre bases independientes.
- Propone Azure como evolución de despliegue, no como una prueba ya realizada.

La consistencia entre sedes se aborda inicialmente mediante una única fuente central de datos. Si en el futuro se necesitara autonomía operativa por sede, se podría estudiar una arquitectura de replicación asíncrona, pero eso requeriría resolver propiedad de datos, conflictos, seguridad y recuperación.


## 11. Cierre del requisito

La arquitectura empresarial conecta los problemas de Nexus Safe-Cloud con una solución ERP centralizada. Proyectos, Facturación, Recursos y Redes no realizan exactamente el mismo trabajo, pero utilizan una información común que reduce duplicidades y facilita la coordinación.

La propuesta combina un monolito modular para el MVP, comunicación REST para las operaciones inmediatas, RabbitMQ para eventos específicos y una evolución hacia infraestructura cloud. Esta decisión permite avanzar de forma controlada, sin presentar como implementadas capacidades que todavía dependen del despliegue, de nuevos datos o de decisiones del negocio.
