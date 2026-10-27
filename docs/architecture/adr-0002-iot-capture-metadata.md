# ADR-0002: analítica de metadatos de captura IoT

- Estado: aceptada por solicitud del usuario.
- Fecha: 2026-10-27.
- Alcance: módulo de monitoreo y métricas IoT basado en `captura_tcp-2_Grupo_Eventos_Temporales.xlsx`.

## Contexto

La captura contiene resumen, paquetes, payloads y conversaciones TCP. La hoja de payloads incluye representación ASCII y hexadecimal que puede contener información sensible. La captura es un conjunto puntual de laboratorio y no acredita telemetría de dispositivos en producción.

## Decisión

Se implementa una sección analítica con KPIs de paquetes, bytes, duración y eficiencia; series de bytes por tiempo; clasificación por tipo de payload; volumen por puerto origen; y tabla paginada de conversaciones y metadatos de payload. La API permite consultar capturas e importar libros `.xlsx` autorizados por rol, además de una tarea CLI.

Se excluyen los campos ASCII y hexadecimal de almacenamiento, logs, API y UI. Se conservan solo clasificación (Texto/Binario/Otro), conteo, bytes, número de paquete, flujo, extremos IP/puerto, tiempos relativos, protocolo, flags y agregados. El archivo fuente permanece en `data/`; la importación guarda su hash SHA-256 para idempotencia, no copia el archivo a la base.

## Consecuencias

- Esta vista es analítica histórica; no es monitoreo en vivo ni inventario de dispositivos verificados.
- El puerto origen para agregación se toma del extremo A de la hoja `Conversaciones`.
- La eficiencia se calcula como bytes de payload / bytes de frame.
- Se requiere ejecutar la migración `13_Create_iot_capture_analytics.sql` antes de importar.
- La carga del mismo archivo se reconoce por hash y no crea una segunda captura.
