-- 0007_grant_service_role.sql
-- Tables created via CLI migrations don't auto-grant to service_role / authenticated / anon
-- the way dashboard-created tables do. Grant explicitly so the Edge Function can read/write.

grant usage on schema public to service_role, authenticated, anon;

-- Existing tables.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- New tables created later (per CREATE TABLE) get the same grants automatically.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
