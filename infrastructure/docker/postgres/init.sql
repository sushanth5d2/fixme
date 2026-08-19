-- Fix Me PostgreSQL initialization script
-- Run automatically on first container start

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fast text search (ILIKE)
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For composite GIN indexes

-- Create development database if needed
-- (handled by POSTGRES_DB env var)

-- Set timezone
SET timezone = 'UTC';
