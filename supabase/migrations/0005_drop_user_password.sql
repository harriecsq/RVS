-- 0005_drop_user_password.sql
-- Passwords belong in auth.users (added in Phase 1), never in our domain table.
-- The original 0001 migration carried a NOT NULL password column to mirror the
-- old KV shape; we drop it before any data lands.

alter table users drop column if exists password;
