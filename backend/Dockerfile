FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY backend/entrypoint.sh ./entrypoint.sh
COPY database/docker-init/01_init_schema.sql /opt/nexus-sql/01_init_schema.sql
COPY database/scripts/ /opt/nexus-sql/
COPY database/scripts/90_Insert_DatosPrueba.sql /database/scripts/90_Insert_DatosPrueba.sql
COPY data/Data_para_Proveedor_ERP.xlsx data/Equipos_Monitoreo_Red_5196.xlsx /opt/nexus-data/
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
