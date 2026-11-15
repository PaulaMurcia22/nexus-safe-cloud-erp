# Checklist de ejecución Azure

## Antes de Azure

- [ ] Confirmar suscripción Azure for Students, crédito, región y cuota.
- [ ] Revisar precios de PostgreSQL, Container Apps, ACR y Log Analytics.
- [ ] Confirmar dominios o FQDN de frontend y backend.
- [ ] Confirmar que RabbitMQ y balanceador no se duplicarán.

## Validación local

- [ ] `docker compose config --quiet`
- [ ] `npm.cmd run build --prefix backend`
- [ ] `npm.cmd run build --prefix frontend`
- [ ] `npm.cmd test --prefix backend`
- [ ] `.\scripts\azure\validate-azure.ps1`

## ACR e imágenes

- [ ] `az login` y seleccionar suscripción.
- [ ] Crear o confirmar grupo de recursos.
- [ ] Validar y crear `acr-bootstrap.bicep`.
- [ ] Publicar backend y frontend con tag inmutable.

## Base de datos

- [ ] Crear PostgreSQL.
- [ ] Confirmar conectividad y SSL.
- [ ] Ejecutar `initialize-postgres.ps1 -Execute` únicamente en una base nueva.
- [ ] Verificar tablas y `/api/health/db`.

## Aplicaciones

- [ ] Revisar imágenes y parámetros.
- [ ] Confirmar `VITE_API_URL` compilada con el backend real.
- [ ] Confirmar `FRONTEND_ORIGIN`.
- [ ] Ejecutar despliegue con confirmaciones.
- [ ] Probar frontend, backend, sesión, persistencia y logs.

## PUNTO DE ENTREGA A LA INTEGRANTE RESPONSABLE

Debe recibir `infra/azure/`, `scripts/azure/`, `docs/deployment/azure/`, Dockerfiles, Compose y el código del repositorio.

Debe proporcionar por canales seguros el ID de suscripción, región, grupo de recursos, dominios y secretos generados durante la ejecución. Debe confirmar costos antes de crear ACR, PostgreSQL, Container Apps y Log Analytics.

Debe devolver al equipo los nombres del ACR y recursos, URLs, resultados de healthchecks, login, persistencia, logs sin secretos, costos estimados y componentes desplegados.

No debe enviar contraseñas, tokens ni archivos temporales al repositorio o al chat.
