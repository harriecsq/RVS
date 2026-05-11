-- seed.sql — apply with: supabase db execute --file supabase/seeds/seed.sql
-- (or psql -f). Order matters because of FKs.

\ir 00_users.sql
\ir 01_clients_contacts.sql
\ir 02_app_settings.sql
