-- Frontend defines the canonical status vocabulary per module
-- (Draft / For Approval / Approved / Paid / Partially Paid / Collected / Completed / Cancelled, etc.).
-- The original CHECK lists are stale and now reject legitimate transitions, so drop them.
alter table expenses    drop constraint if exists expenses_status_check;
alter table vouchers    drop constraint if exists vouchers_status_check;
alter table billings    drop constraint if exists billings_status_check;
alter table collections drop constraint if exists collections_status_check;
