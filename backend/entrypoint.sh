#!/bin/sh
set -eu

echo "Inicializando el administrador configurado..."
node dist/scripts/seed-admin.js

if [ "${LOAD_DEMO_DATA:-false}" = "true" ]; then
  echo "Cargando datos de demostración..."
  node dist/scripts/import-network.js --file /opt/nexus-data/Data_para_Proveedor_ERP.xlsx
  node dist/scripts/import-catalog.js --file /opt/nexus-data/Equipos_Monitoreo_Red_5196.xlsx
  node dist/scripts/seed-demo.js
fi

exec node dist/server.js
