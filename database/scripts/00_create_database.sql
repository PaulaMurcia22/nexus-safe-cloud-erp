-- script para crear la base de datos nexuserpm si no existe
SELECT 'CREATE DATABASE nexuserpm' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nexuserpm')
    