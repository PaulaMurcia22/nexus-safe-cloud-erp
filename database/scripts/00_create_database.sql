-- Propósito: crear nexuserpm si no existe, sin fijar un propietario local.
-- Ejecución: psql -U postgres -d postgres -f database/scripts/00_create_database.sql
-- No elimina ni modifica bases existentes.
SELECT 'CREATE DATABASE nexuserpm'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'nexuserpm')
\gexec
