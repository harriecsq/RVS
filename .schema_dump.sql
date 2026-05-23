


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."advance_counter"("p_scope" "text", "p_year" integer, "p_to_value" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v int;
begin
  insert into id_counters (scope, year, value)
  values (p_scope, p_year, p_to_value)
  on conflict (scope, year) do update
    set value      = greatest(id_counters.value, p_to_value),
        updated_at = now()
  returning value into v;
  return v;
end;
$$;


ALTER FUNCTION "public"."advance_counter"("p_scope" "text", "p_year" integer, "p_to_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_counter"("p_scope" "text", "p_year" integer DEFAULT 0) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v int;
begin
  insert into id_counters (scope, year, value)
  values (p_scope, p_year, 1)
  on conflict (scope, year) do update
    set value      = id_counters.value + 1,
        updated_at = now()
  returning value into v;
  return v;
end;
$$;


ALTER FUNCTION "public"."next_counter"("p_scope" "text", "p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "entity_name" "text",
    "action_type" "text" NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "user_department" "text",
    "old_value" "text",
    "new_value" "text",
    "metadata" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_log_action_type_check" CHECK (("action_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'deleted'::"text", 'commented'::"text", 'approved'::"text", 'rejected'::"text", 'linked'::"text", 'unlinked'::"text"])))
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint DEFAULT 0 NOT NULL,
    "file_type" "text" DEFAULT 'application/octet-stream'::"text" NOT NULL,
    "file_data" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_bookings" (
    "billing_id" "uuid" NOT NULL,
    "booking_id" "uuid" NOT NULL
);


ALTER TABLE "public"."billing_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_expenses" (
    "billing_id" "uuid" NOT NULL,
    "expense_id" "uuid" NOT NULL
);


ALTER TABLE "public"."billing_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_particulars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "billing_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(18,4) DEFAULT 1 NOT NULL,
    "rate" numeric(18,4) DEFAULT 0 NOT NULL,
    "amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "data" "jsonb",
    "position" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_particulars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "billing_number" "text" NOT NULL,
    "billing_company_code" "text" NOT NULL,
    "billing_year" integer NOT NULL,
    "client_id" "uuid" NOT NULL,
    "client_name" "text" NOT NULL,
    "company_name" "text",
    "voucher_id" "uuid",
    "expense_amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "total_expenses" numeric(18,2) DEFAULT 0 NOT NULL,
    "margin" numeric(18,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "exchange_rate" numeric(18,6),
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "billing_date" timestamp with time zone NOT NULL,
    "shipment" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "doc_type" "text" NOT NULL,
    "ref_no" "text",
    "status" "text",
    "file_url" "text",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "leg_order" integer NOT NULL,
    "origin" "text",
    "destination" "text",
    "volume" "text",
    "mode" "text",
    "carrier" "text",
    "etd" "date",
    "eta" "date",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_shipment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_date" timestamp with time zone NOT NULL,
    "description" "text",
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_shipment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_shipment_tags" (
    "booking_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "set_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "set_by" "uuid"
);


ALTER TABLE "public"."booking_shipment_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_tag_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "old_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "new_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "change_type" "text",
    "user_id" "uuid",
    "user_name" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."booking_tag_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_number" "text" NOT NULL,
    "movement" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "client_name" "text" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "origin" "text",
    "destination" "text",
    "commodity" "text",
    "incoterm" "text",
    "mode" "text",
    "carrier" "text",
    "etd" "date",
    "eta" "date",
    "ata" "date",
    "has_trucking" boolean DEFAULT false NOT NULL,
    "trucking_status" "text",
    "linked_booking_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data" "jsonb",
    CONSTRAINT "bookings_incoterm_check" CHECK (("incoterm" = ANY (ARRAY['FOB'::"text", 'CIF'::"text", 'CFR'::"text", 'DAP'::"text", 'EXW'::"text", 'DDP'::"text", 'FCA'::"text", 'CPT'::"text", 'CIP'::"text", 'FAS'::"text", 'DPU'::"text"]))),
    CONSTRAINT "bookings_mode_check" CHECK (("mode" = ANY (ARRAY['Sea'::"text", 'Air'::"text", 'Land'::"text"]))),
    CONSTRAINT "bookings_movement_check" CHECK (("movement" = ANY (ARRAY['IMPORT'::"text", 'EXPORT'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "client_name" "text",
    "industry" "text",
    "status" "text" DEFAULT 'Prospect'::"text" NOT NULL,
    "registered_address" "text",
    "address" "text",
    "lead_source" "text",
    "credit_terms" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "owner_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "clients_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Prospect'::"text", 'Inactive'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "billing_id" "uuid" NOT NULL,
    "amount" numeric(18,2) NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "collection_allocations_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."collection_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_number" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "client_name" "text" NOT NULL,
    "amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "status" "text" DEFAULT 'Collected'::"text" NOT NULL,
    "collection_date" timestamp with time zone NOT NULL,
    "payment_method" "text",
    "reference_number" "text",
    "bank_name" "text",
    "check_number" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data" "jsonb"
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "title" "text",
    "email" "text",
    "phone" "text",
    "company" "text",
    "lifecycle_stage" "text",
    "lead_status" "text",
    "status" "text",
    "last_activity" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    CONSTRAINT "contacts_lead_status_check" CHECK (("lead_status" = ANY (ARRAY['New'::"text", 'Contacted'::"text", 'Qualified'::"text", 'Unqualified'::"text"]))),
    CONSTRAINT "contacts_lifecycle_stage_check" CHECK (("lifecycle_stage" = ANY (ARRAY['Lead'::"text", 'Prospect'::"text", 'Customer'::"text"])))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_particulars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "data" "jsonb",
    "position" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expense_particulars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "segment_id" "uuid",
    "amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data" "jsonb"
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_e_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "ref_no" "text",
    "status" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."form_e_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fsi_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "ref_no" "text",
    "status" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fsi_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."id_counters" (
    "scope" "text" NOT NULL,
    "year" integer DEFAULT 0 NOT NULL,
    "value" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."id_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "from_month" "text" NOT NULL,
    "from_number" integer NOT NULL,
    "to_month" "text" NOT NULL,
    "to_number" integer NOT NULL,
    "user_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."logbook_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logbook_entries" (
    "booking_id" "uuid" NOT NULL,
    "logbook_month" "text" NOT NULL,
    "logbook_number" integer NOT NULL,
    "original_month" "text" NOT NULL,
    "status" "text" DEFAULT 'yellow'::"text" NOT NULL,
    "done_payment_at" timestamp with time zone NOT NULL,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "logbook_entries_status_check" CHECK (("status" = ANY (ARRAY['yellow'::"text", 'green'::"text"])))
);


ALTER TABLE "public"."logbook_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trucking_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_number" "text" NOT NULL,
    "client_id" "uuid",
    "client_name" "text",
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "origin" "text",
    "destination" "text",
    "data" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trucking_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trucking_legs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "leg_number" "text" NOT NULL,
    "parent_booking_type" "text" NOT NULL,
    "parent_booking_id" "uuid" NOT NULL,
    "leg_order" integer,
    "origin" "text",
    "destination" "text",
    "status" "text",
    "data" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trucking_legs_parent_booking_type_check" CHECK (("parent_booking_type" = ANY (ARRAY['IMPORT'::"text", 'EXPORT'::"text", 'TRUCKING'::"text"])))
);


ALTER TABLE "public"."trucking_legs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trucking_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_number" "text" NOT NULL,
    "linked_booking_id" "uuid",
    "linked_segment_id" "uuid",
    "container_no" "text",
    "containers" "jsonb",
    "remarks" "text"[],
    "data" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trucking_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "department" "text" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_billing_balances" AS
SELECT
    NULL::"uuid" AS "billing_id",
    NULL::"text" AS "billing_number",
    NULL::"uuid" AS "client_id",
    NULL::numeric(18,2) AS "total_amount",
    NULL::numeric(18,2) AS "collected",
    NULL::numeric(18,2) AS "outstanding_balance";


ALTER VIEW "public"."v_billing_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voucher_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voucher_id" "uuid" NOT NULL,
    "expense_particular_id" "uuid",
    "description" "text" NOT NULL,
    "amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "data" "jsonb",
    "position" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."voucher_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "voucher_number" "text" NOT NULL,
    "voucher_type" "text" DEFAULT 'CV'::"text" NOT NULL,
    "voucher_year" integer NOT NULL,
    "company_code" "text",
    "payee" "text" NOT NULL,
    "category" "text",
    "bank" "text",
    "check_no" "text",
    "voucher_date" timestamp with time zone NOT NULL,
    "amount" numeric(18,2) DEFAULT 0 NOT NULL,
    "currency" character(3) DEFAULT 'PHP'::"bpchar" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "booking_id" "uuid",
    "expense_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "posting_date" timestamp with time zone,
    "notes" "text",
    "payment_method" "text",
    "delivery_address" "text",
    "loading_address" "text",
    "data" "jsonb",
    CONSTRAINT "vouchers_voucher_type_check" CHECK (("voucher_type" = ANY (ARRAY['CV'::"text", 'PV'::"text", 'JV'::"text", 'RV'::"text"])))
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_bookings"
    ADD CONSTRAINT "billing_bookings_pkey" PRIMARY KEY ("billing_id", "booking_id");



ALTER TABLE ONLY "public"."billing_expenses"
    ADD CONSTRAINT "billing_expenses_pkey" PRIMARY KEY ("billing_id", "expense_id");



ALTER TABLE ONLY "public"."billing_particulars"
    ADD CONSTRAINT "billing_particulars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billings"
    ADD CONSTRAINT "billings_billing_number_key" UNIQUE ("billing_number");



ALTER TABLE ONLY "public"."billings"
    ADD CONSTRAINT "billings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_documents"
    ADD CONSTRAINT "booking_documents_booking_id_doc_type_key" UNIQUE ("booking_id", "doc_type");



ALTER TABLE ONLY "public"."booking_documents"
    ADD CONSTRAINT "booking_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_segments"
    ADD CONSTRAINT "booking_segments_booking_id_leg_order_key" UNIQUE ("booking_id", "leg_order");



ALTER TABLE ONLY "public"."booking_segments"
    ADD CONSTRAINT "booking_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_shipment_events"
    ADD CONSTRAINT "booking_shipment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_shipment_tags"
    ADD CONSTRAINT "booking_shipment_tags_pkey" PRIMARY KEY ("booking_id", "tag");



ALTER TABLE ONLY "public"."booking_tag_history"
    ADD CONSTRAINT "booking_tag_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_booking_number_key" UNIQUE ("booking_number");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_allocations"
    ADD CONSTRAINT "collection_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_collection_number_key" UNIQUE ("collection_number");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_particulars"
    ADD CONSTRAINT "expense_particulars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_e_documents"
    ADD CONSTRAINT "form_e_documents_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."form_e_documents"
    ADD CONSTRAINT "form_e_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fsi_documents"
    ADD CONSTRAINT "fsi_documents_booking_id_key" UNIQUE ("booking_id");



ALTER TABLE ONLY "public"."fsi_documents"
    ADD CONSTRAINT "fsi_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."id_counters"
    ADD CONSTRAINT "id_counters_pkey" PRIMARY KEY ("scope", "year");



ALTER TABLE ONLY "public"."logbook_adjustments"
    ADD CONSTRAINT "logbook_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logbook_entries"
    ADD CONSTRAINT "logbook_entries_logbook_month_logbook_number_key" UNIQUE ("logbook_month", "logbook_number");



ALTER TABLE ONLY "public"."logbook_entries"
    ADD CONSTRAINT "logbook_entries_pkey" PRIMARY KEY ("booking_id");



ALTER TABLE ONLY "public"."payees"
    ADD CONSTRAINT "payees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trucking_bookings"
    ADD CONSTRAINT "trucking_bookings_booking_number_key" UNIQUE ("booking_number");



ALTER TABLE ONLY "public"."trucking_bookings"
    ADD CONSTRAINT "trucking_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trucking_legs"
    ADD CONSTRAINT "trucking_legs_leg_number_key" UNIQUE ("leg_number");



ALTER TABLE ONLY "public"."trucking_legs"
    ADD CONSTRAINT "trucking_legs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trucking_records"
    ADD CONSTRAINT "trucking_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trucking_records"
    ADD CONSTRAINT "trucking_records_record_number_key" UNIQUE ("record_number");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voucher_line_items"
    ADD CONSTRAINT "voucher_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_voucher_number_key" UNIQUE ("voucher_number");



CREATE INDEX "activity_log_entity_idx" ON "public"."activity_log" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "activity_log_timestamp_idx" ON "public"."activity_log" USING "btree" ("timestamp" DESC);



CREATE INDEX "activity_log_user_idx" ON "public"."activity_log" USING "btree" ("user_id");



CREATE INDEX "attachments_entity_idx" ON "public"."attachments" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "billing_bookings_booking_idx" ON "public"."billing_bookings" USING "btree" ("booking_id");



CREATE INDEX "billing_expenses_expense_idx" ON "public"."billing_expenses" USING "btree" ("expense_id");



CREATE INDEX "billing_particulars_billing_idx" ON "public"."billing_particulars" USING "btree" ("billing_id");



CREATE INDEX "billings_client_status_idx" ON "public"."billings" USING "btree" ("client_id", "status");



CREATE INDEX "billings_date_idx" ON "public"."billings" USING "btree" ("billing_date" DESC);



CREATE INDEX "billings_status_idx" ON "public"."billings" USING "btree" ("status");



CREATE INDEX "billings_voucher_idx" ON "public"."billings" USING "btree" ("voucher_id");



CREATE INDEX "billings_year_idx" ON "public"."billings" USING "btree" ("billing_year");



CREATE INDEX "booking_documents_booking_id_idx" ON "public"."booking_documents" USING "btree" ("booking_id");



CREATE INDEX "booking_documents_booking_idx" ON "public"."booking_documents" USING "btree" ("booking_id");



CREATE INDEX "booking_segments_booking_idx" ON "public"."booking_segments" USING "btree" ("booking_id");



CREATE INDEX "booking_shipment_events_booking_idx" ON "public"."booking_shipment_events" USING "btree" ("booking_id", "event_date" DESC);



CREATE INDEX "booking_shipment_tags_tag_idx" ON "public"."booking_shipment_tags" USING "btree" ("tag");



CREATE INDEX "booking_tag_history_booking_idx" ON "public"."booking_tag_history" USING "btree" ("booking_id", "timestamp" DESC);



CREATE INDEX "bookings_client_idx" ON "public"."bookings" USING "btree" ("client_id");



CREATE INDEX "bookings_etd_idx" ON "public"."bookings" USING "btree" ("etd");



CREATE INDEX "bookings_linked_idx" ON "public"."bookings" USING "btree" ("linked_booking_id");



CREATE INDEX "bookings_movement_created_at_idx" ON "public"."bookings" USING "btree" ("movement", "created_at" DESC);



CREATE INDEX "bookings_movement_status_idx" ON "public"."bookings" USING "btree" ("movement", "status");



CREATE INDEX "clients_name_idx" ON "public"."clients" USING "btree" ("name");



CREATE INDEX "clients_owner_idx" ON "public"."clients" USING "btree" ("owner_id");



CREATE INDEX "clients_status_idx" ON "public"."clients" USING "btree" ("status");



CREATE INDEX "collection_allocations_billing_idx" ON "public"."collection_allocations" USING "btree" ("billing_id");



CREATE INDEX "collection_allocations_collection_idx" ON "public"."collection_allocations" USING "btree" ("collection_id");



CREATE INDEX "collections_client_idx" ON "public"."collections" USING "btree" ("client_id");



CREATE INDEX "collections_date_idx" ON "public"."collections" USING "btree" ("collection_date" DESC);



CREATE INDEX "collections_status_idx" ON "public"."collections" USING "btree" ("status");



CREATE INDEX "contacts_client_idx" ON "public"."contacts" USING "btree" ("client_id");



CREATE INDEX "contacts_email_idx" ON "public"."contacts" USING "btree" ("email");



CREATE INDEX "expense_particulars_expense_idx" ON "public"."expense_particulars" USING "btree" ("expense_id");



CREATE INDEX "expenses_booking_idx" ON "public"."expenses" USING "btree" ("booking_id");



CREATE INDEX "expenses_booking_status_idx" ON "public"."expenses" USING "btree" ("booking_id", "status");



CREATE INDEX "expenses_status_idx" ON "public"."expenses" USING "btree" ("status");



CREATE INDEX "form_e_documents_booking_id_idx" ON "public"."form_e_documents" USING "btree" ("booking_id");



CREATE INDEX "fsi_documents_booking_id_idx" ON "public"."fsi_documents" USING "btree" ("booking_id");



CREATE INDEX "logbook_adjustments_from_month_idx" ON "public"."logbook_adjustments" USING "btree" ("from_month");



CREATE INDEX "logbook_adjustments_to_month_idx" ON "public"."logbook_adjustments" USING "btree" ("to_month");



CREATE INDEX "logbook_entries_month_idx" ON "public"."logbook_entries" USING "btree" ("logbook_month");



CREATE UNIQUE INDEX "payees_name_unique" ON "public"."payees" USING "btree" ("lower"("name"));



CREATE INDEX "payees_status_idx" ON "public"."payees" USING "btree" ("status");



CREATE INDEX "trucking_bookings_client_idx" ON "public"."trucking_bookings" USING "btree" ("client_id");



CREATE INDEX "trucking_bookings_status_idx" ON "public"."trucking_bookings" USING "btree" ("status");



CREATE INDEX "trucking_legs_parent_idx" ON "public"."trucking_legs" USING "btree" ("parent_booking_type", "parent_booking_id");



CREATE INDEX "trucking_records_booking_idx" ON "public"."trucking_records" USING "btree" ("linked_booking_id");



CREATE INDEX "trucking_records_segment_idx" ON "public"."trucking_records" USING "btree" ("linked_segment_id");



CREATE INDEX "users_department_idx" ON "public"."users" USING "btree" ("department");



CREATE INDEX "users_role_idx" ON "public"."users" USING "btree" ("role");



CREATE INDEX "voucher_line_items_particular_idx" ON "public"."voucher_line_items" USING "btree" ("expense_particular_id");



CREATE INDEX "voucher_line_items_voucher_idx" ON "public"."voucher_line_items" USING "btree" ("voucher_id");



CREATE INDEX "vouchers_booking_idx" ON "public"."vouchers" USING "btree" ("booking_id");



CREATE INDEX "vouchers_expense_idx" ON "public"."vouchers" USING "btree" ("expense_id");



CREATE INDEX "vouchers_status_idx" ON "public"."vouchers" USING "btree" ("status");



CREATE INDEX "vouchers_voucher_date_idx" ON "public"."vouchers" USING "btree" ("voucher_date" DESC);



CREATE INDEX "vouchers_year_idx" ON "public"."vouchers" USING "btree" ("voucher_year");



CREATE OR REPLACE VIEW "public"."v_billing_balances" AS
 SELECT "b"."id" AS "billing_id",
    "b"."billing_number",
    "b"."client_id",
    "b"."total_amount",
    (COALESCE("sum"("ca"."amount"), (0)::numeric))::numeric(18,2) AS "collected",
    (("b"."total_amount" - COALESCE("sum"("ca"."amount"), (0)::numeric)))::numeric(18,2) AS "outstanding_balance"
   FROM ("public"."billings" "b"
     LEFT JOIN "public"."collection_allocations" "ca" ON (("ca"."billing_id" = "b"."id")))
  GROUP BY "b"."id";



CREATE OR REPLACE TRIGGER "app_settings_set_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "billing_particulars_set_updated_at" BEFORE UPDATE ON "public"."billing_particulars" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "billings_set_updated_at" BEFORE UPDATE ON "public"."billings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "booking_documents_set_updated_at" BEFORE UPDATE ON "public"."booking_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "booking_segments_set_updated_at" BEFORE UPDATE ON "public"."booking_segments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "bookings_set_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "collection_allocations_set_updated_at" BEFORE UPDATE ON "public"."collection_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "collections_set_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "contacts_set_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "expense_particulars_set_updated_at" BEFORE UPDATE ON "public"."expense_particulars" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "expenses_set_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "form_e_documents_set_updated_at" BEFORE UPDATE ON "public"."form_e_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "fsi_documents_set_updated_at" BEFORE UPDATE ON "public"."fsi_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "id_counters_set_updated_at" BEFORE UPDATE ON "public"."id_counters" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trucking_bookings_set_updated_at" BEFORE UPDATE ON "public"."trucking_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trucking_legs_set_updated_at" BEFORE UPDATE ON "public"."trucking_legs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trucking_records_set_updated_at" BEFORE UPDATE ON "public"."trucking_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "voucher_line_items_set_updated_at" BEFORE UPDATE ON "public"."voucher_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "vouchers_set_updated_at" BEFORE UPDATE ON "public"."vouchers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_bookings"
    ADD CONSTRAINT "billing_bookings_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."billings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_bookings"
    ADD CONSTRAINT "billing_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_expenses"
    ADD CONSTRAINT "billing_expenses_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."billings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_expenses"
    ADD CONSTRAINT "billing_expenses_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_particulars"
    ADD CONSTRAINT "billing_particulars_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."billings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billings"
    ADD CONSTRAINT "billings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billings"
    ADD CONSTRAINT "billings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billings"
    ADD CONSTRAINT "billings_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_documents"
    ADD CONSTRAINT "booking_documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_segments"
    ADD CONSTRAINT "booking_segments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_shipment_events"
    ADD CONSTRAINT "booking_shipment_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_shipment_tags"
    ADD CONSTRAINT "booking_shipment_tags_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_shipment_tags"
    ADD CONSTRAINT "booking_shipment_tags_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_tag_history"
    ADD CONSTRAINT "booking_tag_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_tag_history"
    ADD CONSTRAINT "booking_tag_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_linked_booking_id_fkey" FOREIGN KEY ("linked_booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collection_allocations"
    ADD CONSTRAINT "collection_allocations_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."billings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."collection_allocations"
    ADD CONSTRAINT "collection_allocations_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expense_particulars"
    ADD CONSTRAINT "expense_particulars_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."booking_segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."form_e_documents"
    ADD CONSTRAINT "form_e_documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_e_documents"
    ADD CONSTRAINT "form_e_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fsi_documents"
    ADD CONSTRAINT "fsi_documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fsi_documents"
    ADD CONSTRAINT "fsi_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."logbook_adjustments"
    ADD CONSTRAINT "logbook_adjustments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logbook_entries"
    ADD CONSTRAINT "logbook_entries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trucking_bookings"
    ADD CONSTRAINT "trucking_bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."trucking_bookings"
    ADD CONSTRAINT "trucking_bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trucking_legs"
    ADD CONSTRAINT "trucking_legs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trucking_records"
    ADD CONSTRAINT "trucking_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trucking_records"
    ADD CONSTRAINT "trucking_records_linked_booking_id_fkey" FOREIGN KEY ("linked_booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trucking_records"
    ADD CONSTRAINT "trucking_records_linked_segment_id_fkey" FOREIGN KEY ("linked_segment_id") REFERENCES "public"."booking_segments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."voucher_line_items"
    ADD CONSTRAINT "voucher_line_items_expense_particular_id_fkey" FOREIGN KEY ("expense_particular_id") REFERENCES "public"."expense_particulars"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."voucher_line_items"
    ADD CONSTRAINT "voucher_line_items_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE RESTRICT;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_counter"("p_scope" "text", "p_year" integer, "p_to_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."advance_counter"("p_scope" "text", "p_year" integer, "p_to_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_counter"("p_scope" "text", "p_year" integer, "p_to_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."next_counter"("p_scope" "text", "p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."next_counter"("p_scope" "text", "p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_counter"("p_scope" "text", "p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."billing_bookings" TO "anon";
GRANT ALL ON TABLE "public"."billing_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."billing_expenses" TO "anon";
GRANT ALL ON TABLE "public"."billing_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."billing_particulars" TO "anon";
GRANT ALL ON TABLE "public"."billing_particulars" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_particulars" TO "service_role";



GRANT ALL ON TABLE "public"."billings" TO "anon";
GRANT ALL ON TABLE "public"."billings" TO "authenticated";
GRANT ALL ON TABLE "public"."billings" TO "service_role";



GRANT ALL ON TABLE "public"."booking_documents" TO "anon";
GRANT ALL ON TABLE "public"."booking_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_documents" TO "service_role";



GRANT ALL ON TABLE "public"."booking_segments" TO "anon";
GRANT ALL ON TABLE "public"."booking_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_segments" TO "service_role";



GRANT ALL ON TABLE "public"."booking_shipment_events" TO "anon";
GRANT ALL ON TABLE "public"."booking_shipment_events" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_shipment_events" TO "service_role";



GRANT ALL ON TABLE "public"."booking_shipment_tags" TO "anon";
GRANT ALL ON TABLE "public"."booking_shipment_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_shipment_tags" TO "service_role";



GRANT ALL ON TABLE "public"."booking_tag_history" TO "anon";
GRANT ALL ON TABLE "public"."booking_tag_history" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_tag_history" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."collection_allocations" TO "anon";
GRANT ALL ON TABLE "public"."collection_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."expense_particulars" TO "anon";
GRANT ALL ON TABLE "public"."expense_particulars" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_particulars" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."form_e_documents" TO "anon";
GRANT ALL ON TABLE "public"."form_e_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."form_e_documents" TO "service_role";



GRANT ALL ON TABLE "public"."fsi_documents" TO "anon";
GRANT ALL ON TABLE "public"."fsi_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."fsi_documents" TO "service_role";



GRANT ALL ON TABLE "public"."id_counters" TO "anon";
GRANT ALL ON TABLE "public"."id_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."id_counters" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."logbook_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."logbook_entries" TO "anon";
GRANT ALL ON TABLE "public"."logbook_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."logbook_entries" TO "service_role";



GRANT ALL ON TABLE "public"."payees" TO "anon";
GRANT ALL ON TABLE "public"."payees" TO "authenticated";
GRANT ALL ON TABLE "public"."payees" TO "service_role";



GRANT ALL ON TABLE "public"."trucking_bookings" TO "anon";
GRANT ALL ON TABLE "public"."trucking_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."trucking_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."trucking_legs" TO "anon";
GRANT ALL ON TABLE "public"."trucking_legs" TO "authenticated";
GRANT ALL ON TABLE "public"."trucking_legs" TO "service_role";



GRANT ALL ON TABLE "public"."trucking_records" TO "anon";
GRANT ALL ON TABLE "public"."trucking_records" TO "authenticated";
GRANT ALL ON TABLE "public"."trucking_records" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_billing_balances" TO "anon";
GRANT ALL ON TABLE "public"."v_billing_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."v_billing_balances" TO "service_role";



GRANT ALL ON TABLE "public"."voucher_line_items" TO "anon";
GRANT ALL ON TABLE "public"."voucher_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







