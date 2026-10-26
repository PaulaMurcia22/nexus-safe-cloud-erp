# Dominio de operaciones de red

> Parcialmente superado por ADR-0001 (Opción C, servicio gestionado). El inventario real es de un centro de salud y no contiene una relación verificable con cliente o sitio. Para el ejercicio académico se asumirá que es el cliente gestionado de Nexus Safe-Cloud; la asignación se hará explícita como dato sintético/auditado, nunca como una conclusión del archivo fuente. La fase vigente amplía este modelo con sitio de cliente, VLAN explícitas, catálogo de señales y entidades del flujo vertical.

## Alcance y propiedad

El inventario inicial procede de `data/Data_para_Proveedor_ERP.xlsx`. El archivo no prueba si los equipos pertenecen a Nexus Safe-Cloud o a un cliente, ni permite asignarlos a una ciudad o proyecto. La decisión Opción C agrega el supuesto académico de que el centro de salud es un cliente gestionado; se registrará en un ADR y la asignación demo será sintética y auditable. La ciudad del sitio del cliente queda sin confirmar.

`04_Create_network_domain.sql` crea catálogos, activos, IP/MAC, interfaces, enlaces, pools DHCP, controles, tecnologías de monitoreo, lotes e incidencias de importación, auditoría y definiciones de campos personalizados. `source_data` conserva los datos del origen. `extra` se reserva para extensión posterior.

## Normalización y precedencia

- Serial: se conserva el texto en `serial_raw`; para coincidencia se eliminan espacios internos, se convierte a mayúsculas y se quitan guiones finales. El valor normalizado es único. Una fila sin serial utilizable se rechaza y se registra como incidencia.
- IP: se aceptan direcciones IPv4 válidas y se separan valores delimitados por punto y coma.
- MAC: se aceptan 12 dígitos hexadecimales y se guardan en mayúsculas, con dos puntos.
- Booleanos: `true`, `Sí`, `yes`, `1` y equivalentes positivos se convierten en verdadero; `false`, `No`, `0` y equivalentes negativos en falso. `No aparece` se deja como desconocido, no como falso.
- Valores multivalor separados por `;` se procesan individualmente.
- La reimportación identifica por serial normalizado y actualiza solo columnas administradas por el archivo. En activos actualiza datos tipados como `name`, `category`, `model`, `role`, `criticality`, `sys_name`, versión, encendido y datos de configuración, salvo que el API haya registrado esa clave en `manual_overrides`. Las asignaciones manuales de sede/cliente/proyecto, `extra` y ese mapa no se sobrescriben. Los cambios manuales en enlaces y pools deben marcar `extra.user_edited=true`; los upserts del origen los conservan. El serial conserva la regla de fuente y se actualiza al reimportar.
- Los nombres de extremos de enlaces e interfaces solo se resuelven por igualdad exacta; cualquier referencia sin resolver debe quedar como incidencia.

## Incidencias del origen

Las hojas de origen que se esperan son Dispositivos, 01 Inventario, 02 CORE, 03 Enlaces, 04 Interfaces Config, 05 VLAN DHCP, 06 Monitoreo, 07 Posible Monitoreo y 08 IPS MAC GATEWAY. La primera columna de interfaces debe interpretarse por posición aunque el encabezado sea `C`. El libro disponible tiene 148 filas en esa hoja, incluido el encabezado: son 147 filas de datos, una menos que la referencia de 148 interfaces. El importador reporta 147 para que esa diferencia se revise. Diez seriales tienen guion final. IP y MAC pueden ser multivalor. Valores como `2901`, `2911`, `2960-24TT`, `3560-24PS` y `5505` en `Pool / VLAN` son modelos, no pools; se descartan como pools y se reportan. La hoja 08 repite filas por MAC y no incluye `Power Distribution Device0`, que sí está en el inventario. `No aparece` indica ausencia en la configuración exportada. Sufijos como `Multilayer Switch0(1)` se conservan y emparejan exactamente.

El modelo de controles admite `NOT_DETECTED` separado de `NOT_APPLICABLE`. La reconciliación del libro confirma entre los diez equipos de infraestructura: Syslog 0 configurados, SNMP 0, NTP 0, AAA 0, SSH 1, NetFlow 4 y HSRP 2. La columna HSRP distingue `Sí` de `No`; `No` no se cuenta como configurado. Los pools retienen `netmask` por separado y su columna `network` se guarda como dirección de red CIDR calculada desde la IP y la máscara de origen.

## Ejecución

Instalar dependencias del backend y aplicar en orden los scripts SQL hasta `04_Create_network_domain.sql`. Después:

```sh
npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx --dry-run
npm run import:network --prefix backend -- --file ../data/Data_para_Proveedor_ERP.xlsx
```

El modo `--dry-run` analiza el libro y consulta las coincidencias para presentar un conteo sin insertar lotes ni alterar tablas. Una ejecución normal registra lote e incidencias dentro de la misma transacción. No se imprimen secretos. Comprueba los contadores del reporte contra los criterios de aceptación y revisa `import_issues` antes de dar por conciliado el inventario.

## Criterios de reconciliación

La referencia espera 76 activos: 47 computadores, 16 CCTV/IoT, 10 de infraestructura, 1 servidor, 1 dispositivo de energía y 1 WiredEndDevice; criticidad 5/5/66; 74 enlaces (11 críticos); 147 filas de datos de interfaces; 17 pools y 8 tecnologías de monitoreo. Las cinco filas eCustomIOLink tienen funcionalidad en blanco y se tratan como desconocidas, no como fallos. La hoja de controles reconcilia 10 equipos de infraestructura. Un segundo import debe reportar cero inserciones. Diferencias se explican con incidencias, no se corrigen con datos inventados.
