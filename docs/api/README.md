# API de Nexus Safe-Cloud ERP

La especificación [openapi.yaml](./openapi.yaml) describe la API REST utilizada por la interfaz del MVP, en formato OpenAPI 3.0.3. Incluye ejemplos JSON de entrada y respuesta, autenticación por cookie y notas sobre permisos.

## Cómo presentarla

Abre `openapi.yaml` en Swagger Editor o en otra herramienta compatible con OpenAPI 3.0. El documento declara como servidor `http://localhost:3000/api`, que corresponde al puerto predeterminado del backend. Si `PORT` está configurado en `backend/.env`, cambia el servidor en Swagger al puerto configurado.

Para probar solicitudes protegidas, inicia sesión primero con `POST /auth/login`. El backend configura la cookie `nexus_session`; Swagger debe conservarla y enviarla en las solicitudes siguientes. La aplicación valida además el origen de las solicitudes, por lo que una consola Swagger servida desde otro origen puede requerir usar Swagger en el mismo origen o realizar la demostración desde la aplicación.

## Alcance

Se documentaron las operaciones usadas por las pantallas activas: sesión, usuarios, clientes, proyectos, red, contratos, hallazgos, órdenes, horas, facturación y exportaciones Excel. No se incluyeron endpoints que existen en el backend pero que la interfaz activa no llama, como el perfil 360 de clientes que está oculto, mutaciones administrativas de alcance de contratos y CRUD de inventario que no están conectados a la interfaz.

Las respuestas de varias consultas son filas JSON provenientes de PostgreSQL y pueden incluir columnas adicionales conforme al esquema/datos. Por eso algunas se representan como objetos flexibles y sus ejemplos muestran los campos principales. Los reportes `assets`, `findings` y `receivables` descargan `.xlsx`; no devuelven JSON.

La lista de operaciones refleja el estado del frontend/backend al momento de preparar esta documentación y debe actualizarse cuando cambien sus llamadas o rutas.
