-- 01_clients_contacts.sql — foundation clients + linked contacts.
-- Idempotent: truncates first.

begin;

truncate table clients restart identity cascade;
-- contacts cascade-cleared via FK.

insert into clients (id, name, company_name, industry, status, address, phone, email, credit_terms) values
  ('22222222-2222-2222-2222-000000000001', 'Pacific Electronics Manufacturing Corp.', 'Pacific Electronics Manufacturing Corp.', 'Electronics & Technology', 'Active', 'Laguna Technopark, Biñan, Laguna', '+63 49 511 2345', 'procurement@pacificelec.ph', 'Net 30'),
  ('22222222-2222-2222-2222-000000000002', 'Manila Fashion Distributors Inc.',        'Manila Fashion Distributors Inc.',        'Textile & Apparel',       'Active', 'Binondo, Manila',                  '+63 2 8242 5678', 'logistics@manilafashion.com', 'Net 30'),
  ('22222222-2222-2222-2222-000000000003', 'Cebu Food Products Corporation',          'Cebu Food Products Corporation',          'Food & Beverage',         'Active', 'Mandaue City, Cebu',               '+63 32 345 6789', 'imports@cebufood.ph',         'Net 30'),
  ('22222222-2222-2222-2222-000000000004', 'BuildRight Construction Supplies',        'BuildRight Construction Supplies',        'Construction',            'Active', 'Pasig City',                       '+63 2 8631 4567', 'procurement@buildright.ph',   'Net 30'),
  ('22222222-2222-2222-2222-000000000005', 'GreenEnergy Solutions Inc.',              'GreenEnergy Solutions Inc.',              'Renewable Energy',        'Active', 'Taguig City',                      '+63 2 8856 2345', 'projects@greenenergy.ph',     'Net 30');

insert into contacts (id, client_id, first_name, last_name, title, email, phone, company) values
  ('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000001', 'Robert',   'Chen',      'Procurement Manager',        'r.chen@pacificelec.ph',     '+63 917 123 4567', 'Pacific Electronics Manufacturing Corp.'),
  ('33333333-3333-3333-3333-000000000002', '22222222-2222-2222-2222-000000000001', 'Anna',     'Lim',       'Logistics Coordinator',      'a.lim@pacificelec.ph',      '+63 917 234 5678', 'Pacific Electronics Manufacturing Corp.'),
  ('33333333-3333-3333-3333-000000000003', '22222222-2222-2222-2222-000000000002', 'Isabel',   'Garcia',    'Import Manager',             'i.garcia@manilafashion.com','+63 918 456 7890', 'Manila Fashion Distributors Inc.'),
  ('33333333-3333-3333-3333-000000000004', '22222222-2222-2222-2222-000000000003', 'Maria',    'Santos',    'Purchasing Head',            'm.santos@cebufood.ph',      '+63 919 678 9012', 'Cebu Food Products Corporation'),
  ('33333333-3333-3333-3333-000000000005', '22222222-2222-2222-2222-000000000004', 'Jennifer', 'Cruz',      'Procurement Officer',        'j.cruz@buildright.ph',      '+63 921 901 2345', 'BuildRight Construction Supplies'),
  ('33333333-3333-3333-3333-000000000006', '22222222-2222-2222-2222-000000000005', 'Thomas',   'Hernandez', 'Project Coordinator',        't.hernandez@greenenergy.ph','+63 926 789 0123', 'GreenEnergy Solutions Inc.');

commit;
