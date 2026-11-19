#!/bin/sh
set -eu

if [ "${AUTO_MIGRATE_DB:-false}" = "true" ]; then
  echo "Inicializando el esquema PostgreSQL..."
  PGPASSWORD="$DB_PASSWORD" psql \
    "host=$DB_HOST port=${DB_PORT:-5432} dbname=$DB_NAME user=$DB_USER sslmode=${DB_SSL_MODE:-prefer}" \
    -v ON_ERROR_STOP=1 -f /opt/nexus-sql/01_init_schema.sql
fi

echo "Inicializando el administrador configurado..."
node dist/scripts/seed-admin.js

if [ "${LOAD_DEMO_DATA:-false}" = "true" ]; then
  echo "Cargando datos de demostración..."
  if [ -f /opt/nexus-data/Data_para_Proveedor_ERP.xlsx ]; then
    node dist/scripts/import-network.js --file /opt/nexus-data/Data_para_Proveedor_ERP.xlsx
  else
    echo "No hay Excel de topología; se omite esa importación."
  fi
  if [ -f /opt/nexus-data/Equipos_Monitoreo_Red_5196.xlsx ]; then
    node dist/scripts/import-catalog.js --file /opt/nexus-data/Equipos_Monitoreo_Red_5196.xlsx
  else
    echo "No hay Excel de catálogo; se omite esa importación."
  fi
  node dist/scripts/seed-demo.js
fi

exec node dist/server.js
