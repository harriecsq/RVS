-- Persist Trucking voucher addresses so expense templates can reference them.
alter table vouchers add column if not exists delivery_address text;
alter table vouchers add column if not exists loading_address text;
