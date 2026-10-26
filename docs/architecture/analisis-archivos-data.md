# Análisis de los archivos Excel de Nexus Safe-Cloud ERP

> **Parcialmente superado por ADR-0001.** Este análisis conserva el inventario histórico de archivos, pero la selección actual de fuentes es más restrictiva: solo `Data_para_Proveedor_ERP.xlsx` y `Equipos_Monitoreo_Red_5196.xlsx` son fuentes válidas. `Datos_PacketTracer.xlsx` y `captura_tcp-2_Grupo_Eventos_Temporales.xlsx` quedan **descartados**, no se importan ni se modelan. Sus descripciones y propuestas relacionadas se conservan aquí solo como historial y no forman parte del MVP Opción C.

Fecha de análisis: 2026-10-11  
Alcance: inspección de solo lectura de los cuatro archivos `.xlsx` ubicados directamente en `data/`.

## 1. Resumen ejecutivo

La carpeta contiene exactamente cuatro archivos Excel, además de dos archivos PDF auxiliares. Los cuatro Excel no son fuentes de clientes, proyectos, facturación o recursos humanos. Son fuentes técnicas de infraestructura de red, inventario de dispositivos IoT, señales de monitoreo y una captura de tráfico TCP.

| Archivo | Contenido principal | Módulos relacionados | Confianza |
|---|---|---|---|
| `Data para Proveedor ERP.xlsx` | Inventario de red, topología, interfaces, VLAN/DHCP, capacidades de monitoreo y relaciones IP/MAC | Reporting técnico; posible módulo futuro de Assets/Operations | Alta |
| `Datos PacketTracer.xlsx` | Inventario IoT y 4.200 mediciones temporales | Reporting técnico; posible módulo IoT/Monitoring | Alta |
| `Equipos_Monitoreo_Red_5196.xlsx` | Catálogo conceptual de equipos, señales, protocolos y puertos | Reporting/Operations; catálogo de capacidades | Alta |
| `captura_tcp-2_Grupo Eventos Temporales.xlsx` | Resumen, paquetes, payloads y conversaciones TCP de una captura | Reporting técnico; observabilidad/auditoría | Alta |

No hay datos respaldados para poblar `Customers`, `Projects`, `Billing` o `Resources`. Tampoco aparecen clientes, NIT, facturas, pagos, empleados, contratos, horas trabajadas o asignaciones. No debe ejecutarse una migración de negocio desde estos archivos.

La arquitectura que existe actualmente en el proyecto es un **monolito modular**, con frontend React/TypeScript separado del backend Express/TypeScript y PostgreSQL como persistencia exclusiva del backend. La implementación actual ya tiene módulos iniciales de clientes y proyectos, pero estos Excel representan un dominio técnico aún no implementado. No es una arquitectura de microservicios.

## 2. Inventario de archivos

### Archivos principales

| Nombre exacto | Extensión | Tamaño observado | Hojas |
|---|---:|---:|---|
| `Data para Proveedor ERP.xlsx` | `.xlsx` | 70.388 bytes | 9 |
| `Datos PacketTracer.xlsx` | `.xlsx` | 243.924 bytes | 2 |
| `Equipos_Monitoreo_Red_5196.xlsx` | `.xlsx` | 19.589 bytes | 2 |
| `captura_tcp-2_Grupo Eventos Temporales.xlsx` | `.xlsx` | 58.547 bytes | 4 |

### Archivos auxiliares encontrados

También existen `Equipo3_Corte1_Informe.pdf` y `Equipo3_Corte1_Slides.pdf`. No son Excel y no se incorporan al inventario tabular solicitado. No se utilizaron para inferir entidades de ERP.

## 3. Análisis detallado

## 3.1 `Data para Proveedor ERP.xlsx`

Propósito probable: paquete técnico para un proveedor con inventario de infraestructura de red, topología, direccionamiento, configuración y monitoreo. La clasificación tiene confianza alta porque las hojas y columnas son explícitas.

### Hojas y estructura

| Hoja | Filas x columnas | Encabezados / significado |
|---|---:|---|
| `Dispositivos` | 10 x 2 | Métricas resumen: enlaces, infraestructura, routers, firewall, switches, PCs/laptops |
| `01 Inventario` | 77 x 19 | `ID`, `Nombre`, `Tipo PT`, `Modelo`, `Categoría`, `Rol inferido`, `Criticidad`, `Serial`, `SYS_NAME`, `IOS/Command Set`, `IP(s)`, `Máscara(s)`, `Gateway(s)`, `DNS`, `DHCP server(s)`, `MAC(s)`, `Power`, `Config lines`, `Config register` |
| `02 CORE` | 11 x 23 | Equipos, modelo, rol, criticidad, hostname, serial, IP/MAC y capacidades NetFlow, Syslog, SNMP, NTP, SSH, AAA, HSRP, DHCP, ACL, NAT |
| `03 Enlaces` | 75 x 10 | `ID`, origen/destino, puertos, tipo de link/cable, funcionalidad, longitud y criticidad |
| `04 Interfaces Config` | 148 x 7 | Equipo, modelo, interfaz, tipo (`Trunk`/`L3`), IP, máscara y VLAN/detalle |
| `05 VLAN DHCP` | 379 x 6 | Equipo, pool/VLAN, red, máscara, gateway y DNS |
| `06 Monitoreo` | 11 x 20 | Equipo, modelo, criticidad, rol y señales/configuraciones monitorizables |
| `07 Posible Monitoreo` | 9 x 4 | Tecnología, transporte/puerto, qué recolectar y confirmación requerida al proveedor |
| `08 IPS MAC GATEWAY` | 327 x 10 | Relación repetida entre equipo, modelo, categoría, IP, máscara, gateway, DNS, MAC y DHCP |

### Registros representativos

- Inventario: `Multilayer Switch0`, modelo `3560-24PS`, serial `PTT0810DVHA-`, rol `Core / Distribución L3`, criticidad `Crítica`.
- Inventario: `SW1 P1`, modelo `2960-24TT`, serial `CAT1010L70K-`, rol `Acceso`, criticidad `Alta`.
- Enlace 1: `Multilayer Switch0` `GigabitEthernet0/2` hacia `Multilayer Switch0(1)` `GigabitEthernet0/2`.
- Enlace 2: `Multilayer Switch0` `FastEthernet0/1` hacia `SW1 P1` `FastEthernet0/1`.
- Interfaz: `GigabitEthernet0/1`, tipo `L3`, IP `10.0.0.2`, máscara `255.255.255.252`.
- VLAN: `VLAN10_Emergencias`, red `192.168.10.0`, gateway `192.168.10.1`.
- Monitoreo: CPU, memoria, interfaces, errores RX/TX, STP, routing, VLAN y hardware aparecen como señales posibles.

### Diccionario resumido

| Campo | Tipo detectado | Importancia / observación |
|---|---|---|
| `ID` | Entero | Identificador local de hoja; único en `01 Inventario`, `02 CORE` y `03 Enlaces`, pero no universal entre hojas |
| `Nombre` / `Equipo` | Texto | Clave de negocio operativa usada por enlaces, interfaces y monitoreo; requiere catálogo canónico |
| `Serial` | Texto | Candidato a clave natural de activo; los 76 valores de inventario son únicos en esa hoja |
| `IP(s)`, `MAC(s)` | Texto multivalor | Deben normalizarse a tablas hija, no almacenarse con `;` |
| `Modelo`, `Categoría`, `Rol`, `Criticidad` | Texto/catálogo | Requieren catálogos o CHECK controlados después de validación |
| `Config lines`, `DHCP pools`, `ACL`, `NAT` | Número | Contadores o cantidades; no son montos monetarios |
| `Funcional`, `Power` | Texto booleano | Valores como `true`/`SÍ`; requieren normalización a booleano |
| `IP`, `Máscara`, `Gateway`, `DNS` | Texto con formato de red | Candidatos a `inet`/`cidr`, sujetos a validación |

Campos importantes: `Serial`, `Nombre/Equipo`, `Modelo`, interfaces, enlaces, MAC, IP, VLAN y criticidad. Hay muchos vacíos legítimos: por ejemplo, no todos los equipos tienen IP de gestión, gateway, DNS o configuración IOS.

## 3.2 `Datos PacketTracer.xlsx` — DESCARTADO (histórico)

Propósito probable: inventario de dispositivos IoT y serie temporal sintética de mediciones de esos dispositivos. Confianza alta.

| Hoja | Filas x columnas | Encabezados / significado |
|---|---:|---|
| `Inventario Dispositivos` | 33 x 13 | Desde la fila 4: ID de dispositivo, nombre de topología, tipo, ubicación, VLAN, IP, máscara, gateway, MAC, servidor objetivo, estado, tipo de lectura y unidad |
| `IOT` | 4.204 x 13 | Desde la fila 4: ID de registro, timestamp, ID/nombre de dispositivo, ubicación, IP, gateway, MAC, servidor objetivo, estado, valor, unidad y observación/alerta |

Las primeras tres filas de ambas hojas contienen título/espacio previo y no deben cargarse como datos. La hoja `Inventario Dispositivos` tiene 27 IDs de dispositivo no vacíos; contiene además 1 fila exacta repetida dentro del rango tabular y varias filas finales de servidores/arquitectura que no tienen el mismo nivel de detalle que los sensores.

Ejemplos: `IOT-OF1-01` / `WEBCAM_OF1` / `Oficina 1` / `VLAN 10` / `192.168.10.14` / lectura `STREAM` / `FPS`; `IOT-OF1-02` / `TEMP_MON_OF1` / lectura `TEMP`; `IOT-OF1-03` / `HUMID_OF1` / unidad `%`; `IOT-OF1-04` / `MOTION_OF1` / unidad `BOOL`; `IOT-OF1-05` / `IoT10` / `SMOKE` / `PPM`.

La hoja `IOT` contiene 4.200 registros, con 21 IDs de dispositivo con mediciones y 200 registros por dispositivo. Los IDs de medición (`ID Registro`) son únicos; el ID de dispositivo se repite intencionalmente como FK temporal. Los timestamps están almacenados como texto con formato `YYYY-MM-DD HH:MM:SS`, desde `2026-09-13 08:01:00` hasta `2026-09-13 11:20:00`.

| Campo | Tipo detectado | Importancia / transformación |
|---|---|---|
| `ID Dispositivo` | Texto identificador | Candidato a clave de negocio; relación cierta con `IOT.ID Dispositivo` para los 21 dispositivos con eventos |
| `ID Registro` | Entero | Candidato a identificador de medición; único en los 4.200 registros |
| `Timestamp` | Texto fecha-hora | Convertir a `timestamptz` tras confirmar zona horaria |
| IP/MAC/gateway | Texto de red | Normalizar a `inet`/MAC; repetidos por diseño en las mediciones |
| `Valor Valor` | Número | Medición sin tipo físico universal; debe conservarse junto con unidad |
| `Unidad`, `Tipo Lectura` | Texto catálogo | `FPS`, `°C`, `%`, `PPM`, `W`, `BOOL`; requieren catálogo validado |
| `Estado Actual` / `Estado Sensor` | Texto estado | `ONLINE`/`ACTIVE` aparecen como valores; normalizar a catálogo |

## 3.3 `Equipos_Monitoreo_Red_5196.xlsx`

Propósito probable: catálogo conceptual de equipos y señales de monitoreo, no inventario de activos reales. Confianza alta.

| Hoja | Filas x columnas | Encabezados / significado |
|---|---:|---|
| `Equipos y Señales` | 22 x 9 | 21 tipos de equipo, categoría, señales posibles, tipo de dato, protocolos, puertos, plataforma, prioridad y notas |
| `Notas` | 6 x 2 | Instrucciones de uso, categorías incluidas y próximos pasos |

Ejemplos: cámara IP fija, cámara PTZ, NVR/DVR, control de acceso, panel de alarma, switch administrable, router, firewall, servidor, UPS y sensor IoT. Los protocolos incluyen RTSP/RTP, ONVIF, HTTP/HTTPS, SNMP, SSH, Syslog, NetFlow/IPFIX, NTP e ICMP.

No hay seriales, IP, ubicación concreta, cliente, proyecto o equipo real. `Equipo` es un nombre de tipo y no una clave de activo. `Prioridad sugerida` es una recomendación, no un estado transaccional.

## 3.4 `captura_tcp-2_Grupo Eventos Temporales.xlsx` — DESCARTADO (histórico)

Propósito probable: evidencia tabular de una captura TCP/HTTP/WebSocket para análisis de eventos temporales. Confianza alta.

| Hoja | Filas x columnas | Encabezados / significado |
|---|---:|---|
| `Resumen` | 9 x 2 | Métricas agregadas de captura: 148 paquetes, 57 con payload, 32.769 bytes de frame, 22.857 de payload, 26,722209 s y 9 conversaciones |
| `Paquetes` | 149 x 19 | N°, fecha UTC, tiempo relativo, bytes, MAC/IP/puertos, protocolo, TTL, IP ID, longitud IP, Seq, Ack, flags, ventana y payload |
| `Payloads` | 58 x 6 | Paquete, flujo, bytes, tipo, payload ASCII y hexadecimal |
| `Conversaciones` | 10 x 7 | Extremos A/B, paquetes, bytes de frame/payload, inicio y fin relativos |

Ejemplos de flujo: `172.28.0.12:8080` ↔ `172.28.0.1:51340`, conexiones a `8080` y `6000`, protocolo `TCP`, TTL `64`, flags `PSH,ACK` y `ACK`. Hay payloads de texto con cabeceras de WebSocket/Colab y payloads binarios.

| Campo | Tipo detectado | Importancia / observación |
|---|---|---|
| `N°` / `N° paquete` | Entero | Identificador local de paquete; relación cierta entre `Paquetes` y `Payloads` para los paquetes con payload |
| Fecha/hora UTC | Fecha-hora | Tipo fecha detectado; conservar zona UTC |
| IP/MAC/puertos | Texto/entero | Dimensiones técnicas; IP y MAC candidatas a normalización |
| Seq/Ack, IP ID, TTL, ventana | Entero | Metadatos de red; no son entidades ERP de negocio |
| Payload ASCII/hex | Texto | Puede contener información técnica o sensible; no debe cargarse al ERP sin política de retención |

## 4. Calidad y consistencia

### Hallazgos confirmados

1. **No hay entidades de negocio del ERP**: no existen clientes, NIT, proyectos, facturas, pagos, contratos, empleados ni asignaciones.
2. **Filas de metadatos mezcladas con tablas**: `Datos PacketTracer.xlsx` empieza en la fila 4; contiene títulos y filas de servidores/arquitectura dentro de la hoja de inventario. `Equipos_Monitoreo_Red_5196.xlsx/Notas` también usa filas narrativas antes del bloque tabular.
3. **Duplicado exacto**: se detectó una fila exacta repetida en `Datos PacketTracer.xlsx/Inventario Dispositivos`. Debe verificarse antes de cargar.
4. **Identificador no único por diseño en `08 IPS MAC GATEWAY`**: el campo `ID` se repite 26 veces para algunos equipos porque la tabla está a nivel de dirección/MAC, no a nivel de dispositivo.
5. **Valores multivalor**: `IP(s)`, `Máscara(s)`, `Gateway(s)`, `MAC(s)` contienen varios valores separados por `;` en `01 Inventario` y `02 CORE`. Requieren tablas hijas.
6. **Booleans codificados como texto**: `true`, `SÍ`, `No`, `No aparece` y vacíos conviven. `No aparece` no significa necesariamente `false`; debe conservarse como `unknown` o evidencia ausente.
7. **Vacios con significado**: interfaces Trunk no tienen IP; algunos equipos no tienen IP de gestión; `02 CORE/Gateway(s)` está completamente vacío; los campos de infraestructura pueden no aplicar.
8. **Codificación/acentos**: la lectura de algunas etiquetas presenta caracteres alterados (`Categoría`, `Máscara`, `Sí`, `Transmisión`) en la salida de consola. Debe verificarse la codificación visual antes de migrar textos.
9. **Inconsistencia de tipos**: `Datos PacketTracer/IOT.Timestamp` es texto, mientras `captura_tcp/Paquetes/Fecha-hora (UTC)` es fecha Excel. Deben convertirse con reglas distintas.
10. **Contenido repetido intencional**: las 4.200 mediciones repiten ID, IP, MAC, unidad y ubicación; no son duplicados exactos porque cambia `ID Registro`/timestamp, aunque hay secuencias con el mismo valor de medición.

### Duplicados vs. repeticiones legítimas

| Caso | Clasificación |
|---|---|
| `ID` en `01 Inventario`, `02 CORE`, `03 Enlaces` | Único dentro de cada hoja; no es clave global |
| `Serial` en `01 Inventario` | 76 valores no repetidos; candidato fuerte a clave natural de activo |
| `ID` en `08 IPS MAC GATEWAY` | Repetido por diseño de una relación equipo-dirección/MAC |
| `ID Registro` en `IOT` | Único en los 4.200 registros |
| `ID Dispositivo` en `IOT` | Repetido intencionalmente como relación a inventario |
| Fila exacta en inventario IoT | Posible duplicado real; requiere revisión |
| Nombres `Multilayer Switch0`, `Multilayer Switch0(1)`, `SW3 P2` | Posibles claves de negocio de topología; requieren catálogo canónico, no deduplicación automática |

No se pudieron evaluar duplicados de clientes, NIT, facturas, empleados o proyectos porque esas entidades no están presentes.

## 5. Relaciones entre archivos — revisar alcance vigente

Las relaciones que involucren los dos Excel marcados como descartados son antecedentes históricos, no relaciones que se implementarán.

| Relación | Campos | Certeza | Resultado |
|---|---|---|---|
| Inventario ↔ enlaces | `01 Inventario.Nombre` con `03 Enlaces.Origen/Destino` | Alta | Los nombres de extremos de enlace corresponden al inventario; tres nombres de inventario no aparecen en enlaces: `IoT7`, `Power Distribution Device0`, `Signosvitales` |
| Inventario ↔ interfaces | `Nombre/Equipo` con `04 Interfaces Config.C` | Alta/probable | La columna `C` parece equipo; debe renombrarse tras confirmar |
| Inventario ↔ VLAN/DHCP | `Equipo` y modelo | Alta/probable | Las hojas describen el mismo conjunto de infraestructura, pero no tienen FK explícita |
| Inventario ↔ IP/MAC | Equipo, serial, IP/MAC | Alta | `08 IPS MAC GATEWAY` repite detalles por equipo; la relación debe ser por activo y MAC/IP normalizadas |
| Inventario ↔ monitoreo | Equipo/modelo | Alta | Diez equipos aparecen en `02 CORE` y `06 Monitoreo` |
| Inventario IoT ↔ mediciones | `ID Dispositivo` | Alta | Todos los IDs de medición observados pertenecen al inventario; hay 21 dispositivos con eventos |
| Catálogo de monitoreo ↔ inventario real | Categoría/tipo/modelo | Baja | El catálogo no contiene serial, IP ni ID; solo puede guiar capacidades, no establecer FK |
| Captura TCP ↔ inventario/IoT | IP/MAC/puertos | Baja | Hay IPs `172.28.0.x`, puertos 8080/6000 y MACs de la captura; no hay correspondencia demostrada con los activos o sensores de los otros Excel |

No existen campos que permitan relacionar clientes, proyectos, facturas, pagos, empleados o asignaciones.

## 6. Propuesta de modelo relacional PostgreSQL

Esta propuesta es de diseño, no una migración ni una modificación del esquema actual.

### Datos maestros técnicos

| Tabla | Propósito y columnas sugeridas | Claves / restricciones |
|---|---|---|
| `technical_assets` | `id uuid`, `external_name text`, `asset_type text`, `model text`, `category text`, `role text`, `criticality text`, `serial text`, `sys_name text`, `source_file text`, `source_sheet text` | PK `id`; `UNIQUE(serial)` cuando no vacío; `NOT NULL` en nombre/tipo; CHECK para criticidad controlada |
| `asset_interfaces` | `id`, `asset_id`, `interface_name`, `interface_type`, `ip inet`, `network cidr`, `vlan_detail text` | FK a activos; UNIQUE `(asset_id, interface_name)` |
| `asset_macs` | `id`, `asset_id`, `mac macaddr`, `source` | FK; UNIQUE `(asset_id, mac)`; validar MAC |
| `asset_ips` | `id`, `asset_id`, `ip inet`, `mask cidr`, `gateway inet`, `dns inet`, `dhcp_server inet`, `source` | FK; índices por IP/MAC; no asumir una IP única global sin validar |
| `network_links` | `id`, `origin_asset_id`, `origin_port`, `destination_asset_id`, `destination_port`, `link_type`, `cable_type`, `functional boolean`, `length numeric`, `criticality` | Dos FK a `technical_assets`; UNIQUE de extremos/puertos; `functional` nullable si el Excel está vacío |
| `vlans` | `id`, `asset_id`, `pool_name`, `network cidr`, `gateway inet`, `dns inet` | FK; UNIQUE `(asset_id, pool_name, network)` |

### Observabilidad y IoT — propuestas de IoT/captura descartadas

Las tablas `iot_measurements`, `capture_sessions` y `network_packets` que siguen se conservan como ideas históricas del análisis inicial. Están descartadas para el MVP actual; no crearlas ni cargar los archivos correspondientes.

| Tabla | Propósito | Claves / origen |
|---|---|---|
| `monitoring_capabilities` | Catálogo de tecnología, equipo tipo, señal, protocolo, puerto, prioridad y nota | PK; origen `Equipos_Monitoreo_Red_5196` y `07 Posible Monitoreo`; no usar `Equipo` como activo |
| `asset_monitoring_status` | Estado de disponibilidad de Syslog, SNMP, NTP, NetFlow, CPU, memoria, STP, etc. | FK a activo; separar valor `yes/no/unknown/not_reported`; origen `06 Monitoreo` |
| `iot_devices` | `id uuid`, `external_device_id text`, `topology_name`, `device_type`, `location`, `vlan`, `ip inet`, `mask cidr`, `gateway inet`, `mac macaddr`, `target_server inet`, `current_status`, `reading_type`, `unit` | PK interna; `UNIQUE(external_device_id)` y opcionalmente `UNIQUE(mac)`; origen `Inventario Dispositivos` |
| `iot_measurements` | `id bigint`, `device_id uuid`, `measured_at timestamptz`, `sensor_status`, `value numeric`, `unit`, `observation` | PK basada en `ID Registro` si se confirma estabilidad; FK; índice `(device_id, measured_at)`; CHECK para valores/fecha |
| `capture_sessions` | `id`, `started_at timestamptz`, `duration interval`, `packet_count`, `payload_packet_count`, `frame_bytes`, `payload_bytes`, `source_note` | Origen `Resumen`; datos de observabilidad, no transacciones ERP |
| `network_packets` | `id`, `capture_id`, `packet_number`, `captured_at`, `relative_seconds`, `source/destination` IP/MAC/port, protocolo, TCP metadata, payload_bytes | FK; UNIQUE `(capture_id, packet_number)`; payload bruto debe tener retención controlada |
| `network_conversations` | `id`, `capture_id`, extremos, paquetes, bytes e inicio/fin relativo | FK; no relacionar con activos sin una tabla de evidencia de correspondencia |

### Lo que no debe proponerse desde estos Excel

No se justifican tablas `customers`, `projects`, `invoices`, `payments`, `employees`, `resource_assignments` o `contracts` a partir de estas fuentes. Esas tablas pertenecen a requisitos de negocio y deben diseñarse con fuentes de negocio independientes.

Cardinalidades técnicas principales: un activo tiene 0..N IPs, MACs, interfaces y capacidades; un enlace conecta exactamente dos activos; un dispositivo IoT tiene 0..N mediciones; una captura tiene 1..N paquetes/conversaciones. El catálogo de capacidades puede aplicarse a 0..N activos mediante una relación posterior.

## 7. Mapeo a dominios del ERP — parcialmente superado por ADR-0001

| Dominio | Propietario | Entidades de estos Excel | Dependencias |
|---|---|---|---|
| `Customers` | Clientes y datos comerciales | Ninguna | No cargar desde estos archivos |
| `Projects` | Proyectos, etapas y entregables | Ninguna; un futuro proyecto podría referenciar activos técnicos si el negocio lo confirma | Customers |
| `Billing` | Facturas, pagos, cartera, contratos | Ninguna | Customers/Projects |
| `Resources` | Empleados, capacidades, asignaciones | Ninguna | Projects |
| `Reporting` | Lectura y agregación de indicadores | Capturas, mediciones IoT, estado de monitoreo, inventario técnico | Módulo técnico/Operations |
| `Operations/Assets` futuro | Activos, red, IoT y monitoreo | Todas las entidades propuestas en la sección anterior | Projects opcionalmente |

La recomendación es crear un módulo modular `operations` o `technical-assets` dentro del monolito si el alcance lo requiere. Reporting debe consultar sus servicios/repositorios, no duplicar el inventario. Una evolución Strangler Fig podría extraer primero ingesta/observabilidad, pero no se justifica separar un microservicio por tabla ahora.

## 8. Estrategia de migración — antecedente, aplicar solo a fuentes válidas

1. **Inventario y respaldo**: conservar copias inmutables de los cuatro Excel, hashes, fecha, responsable y versión; no editar originales.
2. **Perfilado**: registrar hojas, fila de encabezado, conteos, nulos, tipos, valores de catálogos, duplicados exactos y errores de formato.
3. **Separar bloques**: excluir títulos, filas narrativas y metadatos; documentar rangos cargables por hoja.
4. **Normalizar identificadores**: trim, Unicode/acentos, mayúsculas controladas, MAC a formato canónico, IP a `inet`, timestamps a UTC con zona confirmada.
5. **Resolver duplicados**: eliminar solo el duplicado exacto confirmado en staging; revisar manualmente nombres similares y filas de servidor IoT.
6. **Cargar maestros**: activos, dispositivos IoT, catálogos de modelo/categoría y VLAN/IP/MAC/interface.
7. **Cargar relaciones**: enlaces, monitoreo, capacidades y asignación de dispositivos a mediciones.
8. **Cargar observabilidad**: mediciones IoT y capturas en tablas particionables si el volumen futuro crece.
9. **Validar integridad**: todas las mediciones deben encontrar dispositivo; todo extremo de enlace debe encontrar activo; IP/MAC deben cumplir formato; seriales deben respetar unicidad.
10. **Comparar totales**: activos, enlaces, interfaces, VLAN, dispositivos, 4.200 mediciones, 148 paquetes, 57 payloads y 9 conversaciones contra staging y destino.
11. **Trazabilidad**: mantener `source_file`, `source_sheet`, fila origen, hash de fila, lote de carga, error y decisión de revisión.
12. **No cargar negocio**: clientes/facturas/pagos/proyectos no se pueden migrar hasta obtener fuentes específicas.

Decisiones que requieren confirmación del negocio: si estos activos pertenecen a Nexus o a un cliente/proyecto; qué significan los servidores y filas finales del inventario IoT; zona horaria de mediciones; retención y tratamiento del payload; si `Serial` es realmente único; vocabulario oficial de criticidad/estado; y si el módulo técnico pertenece al ERP o a una herramienta operativa separada.

## 9. Riesgos y decisiones pendientes

- **Riesgo de alcance**: los Excel son técnicos, mientras el MVP actual es Customers/Projects. No deben usarse para diseñar facturación.
- **Riesgo de codificación**: confirmar visualmente caracteres acentuados antes de importar.
- **Riesgo de identidad**: nombres de topología no son claves globales; preferir serial o ID externo validado.
- **Riesgo de semántica**: `No aparece` no equivale a `No`; modelar `unknown`.
- **Riesgo de privacidad/seguridad**: payloads ASCII/hex pueden contener cabeceras, identificadores o datos que no deben almacenarse.
- **Riesgo temporal**: timestamp IoT no declara zona horaria; no convertir silenciosamente a UTC.
- **Riesgo de calidad**: IPs, MACs y valores multivalor requieren staging antes de restricciones definitivas.

## 10. Recomendaciones priorizadas para el MVP

1. Mantener `Customers` y `Projects` separados de estos Excel y conseguir fuentes reales de clientes/proyectos.
2. No alterar el esquema actual del MVP por este análisis; registrar este documento como decisión de arquitectura.
3. Si el alcance técnico es prioritario, implementar primero `technical-assets` con `technical_assets`, `asset_interfaces`, `asset_macs`, `asset_ips`, `network_links`, `iot_devices` e `iot_measurements`.
4. Crear un staging de importación con `source_file`, `source_sheet`, `source_row` y estado de validación antes de insertar en tablas maestras.
5. Definir catálogos oficiales para criticidad, estado, tipo de lectura, unidad y disponibilidad de monitoreo.
6. Validar manualmente la fila IoT duplicada, las filas de servidores, los tres activos sin enlaces y la semántica de `ID` en `08 IPS MAC GATEWAY`.
7. No persistir payload bruto en producción hasta aprobar retención, acceso y clasificación de información.
8. Incorporar pruebas de conteos, integridad referencial y reconciliación en el proceso de migración antes de crear scripts SQL de carga.

