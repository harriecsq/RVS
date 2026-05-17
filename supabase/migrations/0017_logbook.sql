-- Logbook: monthly shipment sequence tracker.
-- An entry exists per booking once shippingLineStatus becomes "Done Payment".
-- Status flips green when the "Delivered" shipment tag is applied.
-- Adjustments move an entry to another month and renumber the source month.

CREATE TABLE IF NOT EXISTS logbook_entries (
  booking_id       uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  logbook_month    text NOT NULL,            -- 'YYYY-MM'
  logbook_number   int  NOT NULL,
  original_month   text NOT NULL,            -- month it first landed in
  status           text NOT NULL DEFAULT 'yellow' CHECK (status IN ('yellow','green')),
  done_payment_at  timestamptz NOT NULL,
  delivered_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (logbook_month, logbook_number)
);

CREATE INDEX IF NOT EXISTS logbook_entries_month_idx
  ON logbook_entries (logbook_month);

CREATE TABLE IF NOT EXISTS logbook_adjustments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_month   text NOT NULL,
  from_number  int  NOT NULL,
  to_month     text NOT NULL,
  to_number    int  NOT NULL,
  user_name    text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logbook_adjustments_from_month_idx
  ON logbook_adjustments (from_month);
CREATE INDEX IF NOT EXISTS logbook_adjustments_to_month_idx
  ON logbook_adjustments (to_month);
