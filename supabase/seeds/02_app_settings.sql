-- 02_app_settings.sql — singleton config rows.
-- Idempotent via ON CONFLICT.

insert into app_settings (key, value) values
  ('document_settings',    '{}'::jsonb),
  ('master_templates',     '[]'::jsonb),
  ('packing_list_metrics', '{}'::jsonb),
  ('custom_pod_options',   '[]'::jsonb)
on conflict (key) do nothing;
