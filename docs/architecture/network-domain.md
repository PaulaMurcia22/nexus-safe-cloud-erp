# Dominio de operaciones de red

> Parcialmente superado por ADR-0001 (Opción C, servicio gestionado). El inventario real es de un centro de salud y no contiene una relación verificable con cliente o sitio. Para el ejercicio académico se asumirá que es el cliente gestionado de Nexus Safe-Cloud; la asignación se hará explícita como dato sintético/auditado, nunca como una conclusión del archivo fuente. La fase vigente amplía este modelo con sitio de cliente, VLAN explícitas, catálogo de señales y entidades del flujo vertical.

## Alcance y propiedad

El inventario inicial procede de `data/Data_para_Proveedor_ERP.xlsx`. El archivo no prueba si los equipos pertenecen a Nexus Safe-Cloud o a un cliente, ni permite asignarlos a una ciudad o proyecto. La decisión Opción C agrega el supuesto académico de que el centro de salud es un cliente gestionado; se registrará en un ADR y la asignación demo será sintética y auditable. La ciudad del sitio del cliente queda sin confirmar.

`04_Create_network_domain.sql` crea catálogos, activos, IP/MAC, interfaces, enlaces, pools DHCP, controles, tecnologías de monitoreo, lotes e incidencias de importación, auditoría y definiciones de campos personalizados. `source_data` conserva los datos del origen. `extra` se reserva para extensión posterior.

## Normalización y precedencia

- Serial: se conserva el texto en `serial_raw`; para coincidencia se eliminan espacios internos, se convierte a mayúsculas y se quitan guiones finales. El valor normalizado es único. Una fila sin serial utilizable se rechaza y se registra como incidencia.
- IP: se aceptan direcciones IPv4 válidas y se separan valores delimitados por punto y coma.
- MAC: se aceptan 12 dígitos hexadecimales y se guardan en mayúsculas, con dos puntos.
- Booleanos: `true`, `Sí`, `yes`, `1` y equivalentes positivos se convierten en verdadero; `false`, `No`, `0` y equivalentes negativos en falso. Un campo vacío y `No aparece` se dejan como desconocidos (`NULL`), no como falso.
- Valores multivalor separados por `;` se procesan individualmente.
- La reimportación identifica por serial normalizado y actualiza solo columnas administradas por el archivo. En activos actualiza datos tipados como `name`, `category`, `model`, `role`, `criticality`, `sys_name`, versión, encendido y datos de configuración, salvo que el API haya registrado esa clave en `manual_overrides`. Las asignaciones manuales de sede/cliente/proyecto, `extra` y ese mapa no se sobrescriben. Los cambios manuales en enlaces y pools deben marcar `extra.user_edited=true`; los upserts del origen los conservan. El serial conserva la regla de fuente y se actualiza al reimportar.
- Los nombres de extremos de enlaces e interfaces solo se resuelven por igualdad exacta; cualquier referencia sin resolver debe quedar como incidencia.

## Incidencias del origen

Las hojas de origen que se esperan son Dispositivos, 01 Inventario, 02 CORE, 03 Enlaces, 04 Interfaces Config, 05 VLAN DHCP, 06 Monitoreo, 07 Posible Monitoreo y 08 IPS MAC GATEWAY. La primera columna de interfaces debe interpretarse por posición aunque el encabezado sea `C`. El libro disponible tiene 148 filas en esa hoja, incluido el encabezado: son 147 filas de datos, una menos que la referencia de 148 interfaces. El importador reporta 147 para que esa diferencia se revise. Diez seriales tienen guion final. IP y MAC pueden ser multivalor. Valores como `2901`, `2911`, `2960-24TT`, `3560-24PS` y `5505` en `Pool / VLAN` son modelos, no pools; se descartan como pools y se reportan. La hoja 08 repite filas por MAC y no incluye `Power Distribution Device0`, que sí está en el inventario. `No aparece` indica ausencia en la configuración exportada. Sufijos como `Multilayer Switch0(1)` se conservan y emparejan exactamente.

El modelo de controles admite `NOT_DETECTED` separado de `NOT_APPLICABLE`. Syslog/SNMP/NTP/SSH/AAA aplican a todos los equipos administrables; NetFlow a routers y núcleo L3; HSRP solo al núcleo L3. La reconciliación confirma 7 configurados (SSH 1, NetFlow 4, HSRP 2), 14 no aplicables (NetFlow 6, HSRP 8) y 49 aplicables no detectados. Los pools retienen `netmask` por separado y su columna `network` se guarda como dirección de red CIDR calculada desde la IP y la máscara de origen.

Las 17 VLAN se importan como entidades explícitas desde nombres `VLANnn_...`, conservando subred y gateway. Biométrico y signos vitales se marcan `SENSITIVE`. Se crean membresías por IP/CIDR y, sin coincidencia IP, por alias de nombre de alta certeza; en la reconciliación quedan 55 membresías potenciales y 21 activos sin asociación, que requieren validación. No se fuerza asignación.

El catálogo de señales se carga separadamente con `import:catalog`; Switches, routers/firewall y servidor se asocian con confianza alta por rol/categoría. Los dispositivos con modelo `Webcam` se asocian con baja confianza a cámara IP fija. Siete activos CCTV/IoT permanecen sin mapeo.

## Ejecución

Instalar dependencias del backend y aplicar en orden los scripts SQL `00` a `11`. Importar primero el catálogo válido y luego el inventario de red para registrar también los mapeos:

```sh
npm run import:catalog --prefix backend -- --file ../data/Equipos_Monitoreo_Red_5196.xlsx --dry-run
npm run import:catalog --prefix backend -- --file ../data/Equipos_Monitoreo_Red_5196.xlsx
npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx --dry-run
npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx
```

El modo `--dry-run` analiza el libro y consulta las coincidencias para presentar un conteo sin insertar lotes ni alterar tablas. Una ejecución normal registra lote e incidencias dentro de la misma transacción. No se imprimen secretos. Comprueba los contadores del reporte contra los criterios de aceptación y revisa `import_issues` antes de dar por conciliado el inventario.

## Criterios de reconciliación

La referencia espera 76 activos: 47 computadores, 16 CCTV/IoT, 10 de infraestructura, 1 servidor, 1 dispositivo de energía y 1 WiredEndDevice; criticidad 5/5/66; 74 enlaces (11 críticos); 147 filas de datos de interfaces; 17 pools, 17 VLAN, 8 tecnologías de monitoreo y 10 equipos de controles. Las cinco filas eCustomIOLink tienen funcionalidad en blanco y se tratan como desconocidas, no como fallos. El catálogo separado reconcilia 21 tipos (6/6/9) y prioridades (11/8/2). Diferencias se explican con incidencias, no se corrigen con datos inventados.
