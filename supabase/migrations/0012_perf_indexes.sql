-- 0012_perf_indexes.sql
-- Indexes for the hot paths: list endpoints ORDER BY created_at and
-- accounting filters by booking_id + status.

-- /bookings, /import-bookings, /export-bookings all sort by created_at desc and
-- the most common filter is movement. Combined index lets the planner satisfy
-- "WHERE movement = X ORDER BY created_at DESC LIMIT N" without a sort step.
create index if not exists bookings_movement_created_at_idx
  on bookings (movement, created_at desc);

-- /expenses?bookingId=... and status filters used by the expenses list.
create index if not exists expenses_booking_status_idx
  on expenses (booking_id, status);
