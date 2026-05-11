-- 00_users.sql — foundation users for the new project
-- Idempotent: re-running drops + reinserts the seeded set.
-- WARNING: cascades through everything referencing users; only safe pre-launch.

begin;

truncate table users restart identity cascade;

insert into users (id, name, email, department, role, is_active) values
  ('11111111-1111-1111-1111-000000000001', 'Maria Santos',   'maria.santos@neuronos.ph', 'BD',                     'Manager',    true),
  ('11111111-1111-1111-1111-000000000002', 'Juan Dela Cruz', 'juan.delacruz@neuronos.ph','Operations',             'Manager',    true),
  ('11111111-1111-1111-1111-000000000003', 'Ana Reyes',      'ana.reyes@neuronos.ph',    'Pricing',                'Specialist', true),
  ('11111111-1111-1111-1111-000000000004', 'Juan Dela Cruz', 'bd.rep@neuron.ph',         'Business Development',   'rep',        true),
  ('11111111-1111-1111-1111-000000000005', 'Maria Santos',   'bd.manager@neuron.ph',     'Business Development',   'manager',    true),
  ('11111111-1111-1111-1111-000000000006', 'Pedro Reyes',    'pd.rep@neuron.ph',         'Pricing',                'rep',        true),
  ('11111111-1111-1111-1111-000000000007', 'Ana Garcia',     'pd.manager@neuron.ph',     'Pricing',                'manager',    true),
  ('11111111-1111-1111-1111-000000000008', 'Carlos Mendoza', 'ops.rep@neuron.ph',        'Operations',             'rep',        true),
  ('11111111-1111-1111-1111-000000000009', 'Sofia Rodriguez','executive@neuron.ph',      'Executive',              'director',   true);

commit;
