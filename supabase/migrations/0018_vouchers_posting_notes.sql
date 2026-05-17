-- Add posting_date and notes columns to vouchers for edit persistence.
alter table vouchers
  add column if not exists posting_date timestamptz,
  add column if not exists notes text;
