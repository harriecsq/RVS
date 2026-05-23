-- NEURON OS schema — generated from local Supabase dump
-- Run order: extensions → tables (parent-first via FKs) → indexes → view → functions
-- Idempotent: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- USERS / CLIENTS (no FK deps)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    email       text NOT NULL UNIQUE,
    department  text NOT NULL,
    role        text NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    company_name        text NOT NULL,
    client_name         text,
    industry            text,
    status              text NOT NULL DEFAULT 'Prospect'
                            CHECK (status IN ('Active','Prospect','Inactive')),
    registered_address  text,
    address             text,
    lead_source         text,
    credit_terms        text,
    phone               text,
    email               text,
    notes               text,
    owner_id            uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contacts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    first_name      text,
    last_name       text,
    name            text,
    title           text,
    email           text,
    phone           text,
    company         text,
    lifecycle_stage text CHECK (lifecycle_stage IN ('Lead','Prospect','Customer')),
    lead_status     text CHECK (lead_status IN ('New','Contacted','Qualified','Unqualified')),
    status          text,
    last_activity   timestamptz,
    notes           text,
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payees (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    type       text NOT NULL DEFAULT '',
    status     text NOT NULL DEFAULT 'Active',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- BOOKINGS + CHILDREN
-- =========================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number    text NOT NULL UNIQUE,
    movement          text NOT NULL CHECK (movement IN ('IMPORT','EXPORT')),
    client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name       text NOT NULL,
    status            text NOT NULL DEFAULT 'Draft',
    origin            text,
    destination       text,
    commodity         text,
    incoterm          text CHECK (incoterm IN ('FOB','CIF','CFR','DAP','EXW','DDP','FCA','CPT','CIP','FAS','DPU')),
    mode              text CHECK (mode IN ('Sea','Air','Land')),
    carrier           text,
    etd               date,
    eta               date,
    ata               date,
    has_trucking      boolean NOT NULL DEFAULT false,
    trucking_status   text,
    linked_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
    data              jsonb,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_segments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    leg_order   integer NOT NULL,
    origin      text,
    destination text,
    volume      text,
    mode        text,
    carrier     text,
    etd         date,
    eta         date,
    data        jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (booking_id, leg_order)
);

CREATE TABLE IF NOT EXISTS public.booking_documents (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    doc_type   text NOT NULL,
    ref_no     text,
    status     text,
    file_url   text,
    data       jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (booking_id, doc_type)
);

CREATE TABLE IF NOT EXISTS public.booking_shipment_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    event_type  text NOT NULL,
    event_date  timestamptz NOT NULL,
    description text,
    data        jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_shipment_tags (
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    tag        text NOT NULL,
    set_at     timestamptz NOT NULL DEFAULT now(),
    set_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    PRIMARY KEY (booking_id, tag)
);

CREATE TABLE IF NOT EXISTS public.booking_tag_history (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    old_tags    text[] NOT NULL DEFAULT '{}',
    new_tags    text[] NOT NULL DEFAULT '{}',
    change_type text,
    user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    user_name   text,
    timestamp   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_e_documents (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    ref_no     text,
    status     text,
    data       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fsi_documents (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    ref_no     text,
    status     text,
    data       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- TRUCKING
-- =========================================================

CREATE TABLE IF NOT EXISTS public.trucking_bookings (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number text NOT NULL UNIQUE,
    client_id      uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name    text,
    status         text NOT NULL DEFAULT 'Draft',
    origin         text,
    destination    text,
    data           jsonb,
    created_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trucking_legs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    leg_number          text NOT NULL UNIQUE,
    parent_booking_type text NOT NULL CHECK (parent_booking_type IN ('IMPORT','EXPORT','TRUCKING')),
    parent_booking_id   uuid NOT NULL,
    leg_order           integer,
    origin              text,
    destination         text,
    status              text,
    data                jsonb,
    created_by          uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trucking_records (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    record_number     text NOT NULL UNIQUE,
    linked_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    linked_segment_id uuid REFERENCES public.booking_segments(id) ON DELETE SET NULL,
    container_no      text,
    containers        jsonb,
    remarks           text[],
    data              jsonb,
    created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- ACCOUNTING: EXPENSES → VOUCHERS → BILLINGS → COLLECTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES public.bookings(id) ON DELETE RESTRICT,
    segment_id uuid REFERENCES public.booking_segments(id) ON DELETE SET NULL,
    amount     numeric(18,2) NOT NULL DEFAULT 0,
    currency   char(3) NOT NULL DEFAULT 'PHP',
    status     text NOT NULL DEFAULT 'Pending',
    notes      text,
    data       jsonb,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_particulars (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id  uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount      numeric(18,2) NOT NULL DEFAULT 0,
    currency    char(3) NOT NULL DEFAULT 'PHP',
    data        jsonb,
    position    integer,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vouchers (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number   text NOT NULL UNIQUE,
    voucher_type     text NOT NULL DEFAULT 'CV' CHECK (voucher_type IN ('CV','PV','JV','RV')),
    voucher_year     integer NOT NULL,
    company_code     text,
    payee            text NOT NULL,
    category         text,
    bank             text,
    check_no         text,
    voucher_date     timestamptz NOT NULL,
    amount           numeric(18,2) NOT NULL DEFAULT 0,
    currency         char(3) NOT NULL DEFAULT 'PHP',
    status           text NOT NULL DEFAULT 'Draft',
    booking_id       uuid REFERENCES public.bookings(id) ON DELETE RESTRICT,
    expense_id       uuid REFERENCES public.expenses(id) ON DELETE RESTRICT,
    posting_date     timestamptz,
    notes            text,
    payment_method   text,
    delivery_address text,
    loading_address  text,
    data             jsonb,
    created_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voucher_line_items (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id            uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    expense_particular_id uuid REFERENCES public.expense_particulars(id) ON DELETE SET NULL,
    description           text NOT NULL,
    amount                numeric(18,2) NOT NULL DEFAULT 0,
    currency              char(3) NOT NULL DEFAULT 'PHP',
    data                  jsonb,
    position              integer,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billings (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_number       text NOT NULL UNIQUE,
    billing_company_code text NOT NULL,
    billing_year         integer NOT NULL,
    client_id            uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name          text NOT NULL,
    company_name         text,
    voucher_id           uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
    expense_amount       numeric(18,2) NOT NULL DEFAULT 0,
    total_expenses       numeric(18,2) NOT NULL DEFAULT 0,
    margin               numeric(18,2) NOT NULL DEFAULT 0,
    total_amount         numeric(18,2) NOT NULL DEFAULT 0,
    currency             char(3) NOT NULL DEFAULT 'PHP',
    exchange_rate        numeric(18,6),
    status               text NOT NULL DEFAULT 'Draft',
    billing_date         timestamptz NOT NULL,
    shipment             jsonb,
    created_by           uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_particulars (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_id  uuid NOT NULL REFERENCES public.billings(id) ON DELETE CASCADE,
    description text NOT NULL,
    quantity    numeric(18,4) NOT NULL DEFAULT 1,
    rate        numeric(18,4) NOT NULL DEFAULT 0,
    amount      numeric(18,2) NOT NULL DEFAULT 0,
    currency    char(3) NOT NULL DEFAULT 'PHP',
    data        jsonb,
    position    integer,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_bookings (
    billing_id uuid NOT NULL REFERENCES public.billings(id) ON DELETE CASCADE,
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    PRIMARY KEY (billing_id, booking_id)
);

CREATE TABLE IF NOT EXISTS public.billing_expenses (
    billing_id uuid NOT NULL REFERENCES public.billings(id) ON DELETE CASCADE,
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
    PRIMARY KEY (billing_id, expense_id)
);

CREATE TABLE IF NOT EXISTS public.collections (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_number text NOT NULL UNIQUE,
    client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name       text NOT NULL,
    amount            numeric(18,2) NOT NULL DEFAULT 0,
    currency          char(3) NOT NULL DEFAULT 'PHP',
    status            text NOT NULL DEFAULT 'Collected',
    collection_date   timestamptz NOT NULL,
    payment_method    text,
    reference_number  text,
    bank_name         text,
    check_number      text,
    notes             text,
    data              jsonb,
    created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collection_allocations (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    billing_id    uuid NOT NULL REFERENCES public.billings(id) ON DELETE RESTRICT,
    amount        numeric(18,2) NOT NULL CHECK (amount >= 0),
    currency      char(3) NOT NULL DEFAULT 'PHP',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- LOGBOOK
-- =========================================================

CREATE TABLE IF NOT EXISTS public.logbook_entries (
    booking_id      uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
    logbook_month   text NOT NULL,
    logbook_number  integer NOT NULL,
    original_month  text NOT NULL,
    status          text NOT NULL DEFAULT 'yellow' CHECK (status IN ('yellow','green')),
    done_payment_at timestamptz NOT NULL,
    delivered_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (logbook_month, logbook_number)
);

CREATE TABLE IF NOT EXISTS public.logbook_adjustments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    from_month  text NOT NULL,
    from_number integer NOT NULL,
    to_month    text NOT NULL,
    to_number   integer NOT NULL,
    user_name   text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- SYSTEM
-- =========================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     text NOT NULL,
    entity_id       text NOT NULL,
    entity_name     text,
    action_type     text NOT NULL
                        CHECK (action_type IN ('created','updated','deleted','commented','approved','rejected','linked','unlinked')),
    user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
    user_name       text,
    user_department text,
    old_value       text,
    new_value       text,
    metadata        jsonb,
    timestamp       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attachments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id   text NOT NULL,
    file_name   text NOT NULL,
    file_size   bigint NOT NULL DEFAULT 0,
    file_type   text NOT NULL DEFAULT 'application/octet-stream',
    file_data   text,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.id_counters (
    scope      text NOT NULL,
    year       integer NOT NULL DEFAULT 0,
    value      integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (scope, year)
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS activity_log_entity_idx       ON public.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_log_timestamp_idx    ON public.activity_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_idx         ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS attachments_entity_idx        ON public.attachments (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS billing_bookings_booking_idx     ON public.billing_bookings (booking_id);
CREATE INDEX IF NOT EXISTS billing_expenses_expense_idx     ON public.billing_expenses (expense_id);
CREATE INDEX IF NOT EXISTS billing_particulars_billing_idx  ON public.billing_particulars (billing_id);
CREATE INDEX IF NOT EXISTS billings_client_status_idx       ON public.billings (client_id, status);
CREATE INDEX IF NOT EXISTS billings_date_idx                ON public.billings (billing_date DESC);
CREATE INDEX IF NOT EXISTS billings_status_idx              ON public.billings (status);
CREATE INDEX IF NOT EXISTS billings_voucher_idx             ON public.billings (voucher_id);
CREATE INDEX IF NOT EXISTS billings_year_idx                ON public.billings (billing_year);

CREATE INDEX IF NOT EXISTS booking_documents_booking_idx       ON public.booking_documents (booking_id);
CREATE INDEX IF NOT EXISTS booking_segments_booking_idx        ON public.booking_segments (booking_id);
CREATE INDEX IF NOT EXISTS booking_shipment_events_booking_idx ON public.booking_shipment_events (booking_id, event_date DESC);
CREATE INDEX IF NOT EXISTS booking_shipment_tags_tag_idx       ON public.booking_shipment_tags (tag);
CREATE INDEX IF NOT EXISTS booking_tag_history_booking_idx     ON public.booking_tag_history (booking_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS bookings_client_idx              ON public.bookings (client_id);
CREATE INDEX IF NOT EXISTS bookings_etd_idx                 ON public.bookings (etd);
CREATE INDEX IF NOT EXISTS bookings_linked_idx              ON public.bookings (linked_booking_id);
CREATE INDEX IF NOT EXISTS bookings_movement_created_at_idx ON public.bookings (movement, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_movement_status_idx     ON public.bookings (movement, status);

CREATE INDEX IF NOT EXISTS clients_name_idx   ON public.clients (name);
CREATE INDEX IF NOT EXISTS clients_owner_idx  ON public.clients (owner_id);
CREATE INDEX IF NOT EXISTS clients_status_idx ON public.clients (status);

CREATE INDEX IF NOT EXISTS collection_allocations_billing_idx    ON public.collection_allocations (billing_id);
CREATE INDEX IF NOT EXISTS collection_allocations_collection_idx ON public.collection_allocations (collection_id);
CREATE INDEX IF NOT EXISTS collections_client_idx                ON public.collections (client_id);
CREATE INDEX IF NOT EXISTS collections_date_idx                  ON public.collections (collection_date DESC);
CREATE INDEX IF NOT EXISTS collections_status_idx                ON public.collections (status);

CREATE INDEX IF NOT EXISTS contacts_client_idx ON public.contacts (client_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx  ON public.contacts (email);

CREATE INDEX IF NOT EXISTS expense_particulars_expense_idx ON public.expense_particulars (expense_id);
CREATE INDEX IF NOT EXISTS expenses_booking_idx            ON public.expenses (booking_id);
CREATE INDEX IF NOT EXISTS expenses_booking_status_idx     ON public.expenses (booking_id, status);
CREATE INDEX IF NOT EXISTS expenses_status_idx             ON public.expenses (status);

CREATE INDEX IF NOT EXISTS form_e_documents_booking_id_idx ON public.form_e_documents (booking_id);
CREATE INDEX IF NOT EXISTS fsi_documents_booking_id_idx    ON public.fsi_documents (booking_id);

CREATE INDEX IF NOT EXISTS logbook_adjustments_from_month_idx ON public.logbook_adjustments (from_month);
CREATE INDEX IF NOT EXISTS logbook_adjustments_to_month_idx   ON public.logbook_adjustments (to_month);
CREATE INDEX IF NOT EXISTS logbook_entries_month_idx          ON public.logbook_entries (logbook_month);

CREATE INDEX IF NOT EXISTS payees_status_idx ON public.payees (status);

CREATE INDEX IF NOT EXISTS trucking_bookings_client_idx ON public.trucking_bookings (client_id);
CREATE INDEX IF NOT EXISTS trucking_bookings_status_idx ON public.trucking_bookings (status);
CREATE INDEX IF NOT EXISTS trucking_legs_parent_idx     ON public.trucking_legs (parent_booking_type, parent_booking_id);
CREATE INDEX IF NOT EXISTS trucking_records_booking_idx ON public.trucking_records (linked_booking_id);
CREATE INDEX IF NOT EXISTS trucking_records_segment_idx ON public.trucking_records (linked_segment_id);

CREATE INDEX IF NOT EXISTS users_department_idx ON public.users (department);
CREATE INDEX IF NOT EXISTS users_role_idx       ON public.users (role);

CREATE INDEX IF NOT EXISTS voucher_line_items_particular_idx ON public.voucher_line_items (expense_particular_id);
CREATE INDEX IF NOT EXISTS voucher_line_items_voucher_idx    ON public.voucher_line_items (voucher_id);
CREATE INDEX IF NOT EXISTS vouchers_booking_idx              ON public.vouchers (booking_id);
CREATE INDEX IF NOT EXISTS vouchers_expense_idx              ON public.vouchers (expense_id);
CREATE INDEX IF NOT EXISTS vouchers_status_idx               ON public.vouchers (status);
CREATE INDEX IF NOT EXISTS vouchers_voucher_date_idx         ON public.vouchers (voucher_date DESC);
CREATE INDEX IF NOT EXISTS vouchers_year_idx                 ON public.vouchers (voucher_year);

-- =========================================================
-- VIEW: billing balances (collected vs outstanding)
-- =========================================================

CREATE OR REPLACE VIEW public.v_billing_balances AS
SELECT
    b.id            AS billing_id,
    b.billing_number,
    b.client_id,
    b.total_amount,
    COALESCE(SUM(ca.amount), 0)::numeric(18,2)              AS collected,
    (b.total_amount - COALESCE(SUM(ca.amount), 0))::numeric(18,2) AS outstanding_balance
FROM public.billings b
LEFT JOIN public.collection_allocations ca ON ca.billing_id = b.id
GROUP BY b.id, b.billing_number, b.client_id, b.total_amount;

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_counter(p_scope text, p_year integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
    v_value integer;
BEGIN
    INSERT INTO public.id_counters (scope, year, value)
    VALUES (p_scope, p_year, 1)
    ON CONFLICT (scope, year)
    DO UPDATE SET value = public.id_counters.value + 1, updated_at = now()
    RETURNING value INTO v_value;
    RETURN v_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_counter(p_scope text, p_year integer, p_to_value integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
    v_value integer;
BEGIN
    INSERT INTO public.id_counters (scope, year, value)
    VALUES (p_scope, p_year, p_to_value)
    ON CONFLICT (scope, year)
    DO UPDATE SET value = GREATEST(public.id_counters.value, p_to_value), updated_at = now()
    RETURNING value INTO v_value;
    RETURN v_value;
END;
$$;
