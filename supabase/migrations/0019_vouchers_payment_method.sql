-- Add payment_method to vouchers. reference_number reuses existing check_no column.
alter table vouchers add column if not exists payment_method text;
