#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable pgvector in the main DB
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Connector Databases
    CREATE DATABASE deseo_connector_github;
    CREATE DATABASE deseo_connector_gsc;
    CREATE DATABASE deseo_connector_payload;

    -- Payload Test Stuff
    CREATE USER payload_test_user WITH PASSWORD 'payload_test_password';
    CREATE DATABASE deseo_test_payload;
    GRANT ALL PRIVILEGES ON DATABASE deseo_test_payload TO payload_test_user;
    
    -- Connect to the new database to create the schema
    \c deseo_test_payload
    CREATE SCHEMA payload;
    GRANT ALL ON SCHEMA payload TO payload_test_user;
    -- Also allow user to create stuff in public just in case
    GRANT ALL ON SCHEMA public TO payload_test_user;
EOSQL
