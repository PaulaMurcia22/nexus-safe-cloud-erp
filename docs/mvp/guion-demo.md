# Guion de demostración del corte vertical

La demo utiliza el centro de salud como cliente gestionado solo por el supuesto académico S-01. El Excel válido contiene el inventario, no confirma propiedad ni conectividad en vivo. Los controles faltantes se presentan como señales derivadas del archivo y requieren validación operativa.

## Preparación

1. Crear una base PostgreSQL limpia y ejecutar `database/scripts/00_create_database.sql`, después `01_` a `11_` en orden.
2. Importar `Data_para_Proveedor_ERP.xlsx` y `Equipos_Monitoreo_Red_5196.xlsx` con los importadores. Confirmar 76 activos, 74 enlaces, 147 interfaces, 17 VLAN y 21 señales de catálogo.
3. Exportar `DEMO_USERS_PASSWORD` en el entorno local con mínimo 12 caracteres. No guardarla en Git ni compartirla por pantalla.
4. Ejecutar `npm run seed:demo --prefix backend -- --dry-run` y, tras validar que reporta 76 activos, `npm run seed:demo --prefix backend`.
5. Iniciar backend y frontend. Entrar con `admin@nexus.demo.invalid` y el secreto que se configuró localmente.

## Recorrido

1. **Cliente y sede:** abrir **Clientes**, seleccionar **360** en `DEMO - Centro de Salud Gestionado`. Revisar el cliente, la sede `Sin confirmar`, activos agregados, contrato, proyecto y cartera. Las entidades creadas para la demo llevan la insignia **Dato sintético**.
2. **Activos:** abrir **Red** y mostrar los 76 registros importados. La asignación al sitio/cliente es un supuesto del escenario y quedó auditada por `bulkAssign`.
3. **Contrato y alcance:** entrar a **Contratos**, elegir `DEMO-SVC-001` y revisar la matriz activo × señal. La demo incluye cinco señales para infraestructura, solo ICMP para CCTV/IoT y excluye endpoints.
4. **Hallazgos:** en **Hallazgos**, seleccionar **Generar desde contrato**. Se crean solo hallazgos de controles aplicables marcados como no detectados, enlaces expresamente no funcionales y datos de inventario incompletos. Los cinco enlaces en blanco permanecen desconocidos y no disparan hallazgos.
5. **Orden de trabajo:** seleccionar **Crear OT** en un hallazgo. La semilla también prepara cinco órdenes sintéticas para que el panel tenga contenido inicial.
6. **Horas:** salir e ingresar como `technician@nexus.demo.invalid` con la contraseña demo. En **Órdenes**, registrar una hora en una orden asignada. Al superar el 90% del estimado, aparece la alerta. La edición y eliminación de horas propias está limitada a los últimos siete días.
7. **Hito y factura:** cambiar al perfil `admin@nexus.demo.invalid` o `pmo@nexus.demo.invalid`. En **Facturación**, crear **Nuevo hito para demo** (el seed conserva sus tres hitos ya vinculados a las tres facturas de cartera), luego **Cerrar y facturar** para crear una factura en borrador. Emitirla con perfil financiero o administrador; el resultado electrónico se etiqueta `SIMULATED_ACCEPTED`.
8. **Cartera:** revisar las facturas pagadas, emitidas vigentes y vencidas, y sus rangos por antigüedad. Las facturas demo son registros sintéticos; el estado simulado no equivale a aceptación DIAN.
9. **Dashboard y exportación:** volver a **Inicio** para revisar inventario, contratos, hallazgos, horas y facturación. Exportar los reportes Excel permitidos por el rol.
10. **Simular caída:** en **Red → Topología**, cargar activos y simular la caída de un switch. El grafo resalta los nodos que pierden ruta a un rol `WAN / Internet`; el cálculo es una simulación local sobre el inventario, no una acción de red.

## Reinicio

Para volver al estado previo a la demo, ejecutar `npm run seed:demo --prefix backend -- --reset-synthetic --confirm`. El comando elimina exclusivamente filas con `data_origin='SYNTHETIC'`, conserva clientes/filas manuales o importadas y limpia la asignación del inventario importado con entrada de auditoría. No usarlo en una base compartida sin revisar su origen.

## Limitaciones visibles

- No hay disponibilidad ni métricas de dispositivos en vivo.
- La ciudad real de la sede se desconoce y se muestra `Sin confirmar`.
- El proveedor de factura electrónica es simulado; DIAN, PDF y SSO/MFA/ZTNA no forman parte de esta demo.
- La simulación del grafo depende de los enlaces estáticos del Excel y no representa una conmutación real.
