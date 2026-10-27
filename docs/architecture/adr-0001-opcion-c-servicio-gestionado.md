# ADR-0001: modelar el centro de salud como cliente gestionado

- Estado: aceptada para el MVP académico.
- Fecha: 2026-10-25.
- Alcance: datos, demostración y documentación del corte vertical.

## Contexto

El informe de Corte 1 define un ERP de servicios gestionados para Nexus Safe-Cloud. De las fuentes Excel, `Data_para_Proveedor_ERP.xlsx` contiene activos y topología de un centro de salud, mientras `Equipos_Monitoreo_Red_5196.xlsx` describe capacidades de equipos. Ninguna fuente identifica una razón social, NIT, ciudad, contrato, proyecto, horas ni facturas. La app existente implementa autenticación, clientes, proyectos y un módulo de inventario de red.

## Decisión

Para demostrar el flujo de extremo a extremo se asumirá que el centro de salud es un cliente gestionado de Nexus Safe-Cloud. El cliente y las entidades de negocio necesarias para la demo serán sintéticos y llevarán `data_origin='SYNTHETIC'`. La asignación de los 76 activos al cliente y a su sede se hará como una acción explícita, auditada y reversible solo mediante el procedimiento de reset sintético. No se atribuirá la propiedad a partir del Excel.

La ciudad de la sede del cliente no está acreditada por las fuentes; se registrará literalmente como `Sin confirmar`. Las oficinas internas Medellín, Bogotá y Remoto compartido siguen siendo sedes internas distintas.

Las fuentes de inventario válidas son `Data_para_Proveedor_ERP.xlsx` y `Equipos_Monitoreo_Red_5196.xlsx`. `Datos_PacketTracer.xlsx` se descarta porque contradice el direccionamiento del archivo válido. El alcance de la captura temporal se actualiza en [ADR-0002](adr-0002-iot-capture-metadata.md).

## Alternativas consideradas

- **A — Pivotar a solo monitoreo:** mantiene todo el dato en el dominio técnico, pero no demuestra el objetivo central de CRM, servicio contratado, trabajo y facturación.
- **B — Crear clientes y finanzas ficticios sin relación con la red:** facilita mostrar pantallas, pero no prueba el corte vertical de un servicio gestionado.
- **C — Servicio gestionado con cliente sintético explícito:** conecta los activos reales con contratos y trabajo de demo, manteniendo trazabilidad entre evidencia y supuesto. Elegida.

## Consecuencias

- Los activos y señales importados conservan hash, lote, incidencias y origen `IMPORTED`.
- Los registros de negocio de demostración se etiquetan `SYNTHETIC` y muestran una insignia visible.
- El catálogo de monitoreo orienta el alcance; no implica telemetría ni disponibilidad en vivo.
- No se guardan payloads brutos. El uso analítico limitado de metadatos de una captura se define en ADR-0002. VLAN de biométrico y signos vitales se clasifican como sensibles.
- La demo prueba un flujo académico, no acredita que Nexus opere realmente el centro de salud ni que las cifras financieras sean reales.

