-- Catch-all JSON blob for denormalized booking/shipment snapshot data
-- so detail screens can render the full context that was captured at create-time
-- (BL #, vessel, container nos, commodity, addresses, etc.).
alter table expenses    add column if not exists data jsonb;
alter table vouchers    add column if not exists data jsonb;
alter table collections add column if not exists data jsonb;
