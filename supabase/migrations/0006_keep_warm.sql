-- 0005_keep_warm.sql
-- Pings the edge function /health endpoint every 4 minutes via pg_cron + pg_net
-- so the Deno isolate stays warm and initial module loads (Reports, Logbook, etc.)
-- don't pay a cold-start tax of 1–3s.
--
-- Why 4 minutes: Supabase edge function isolates are typically evicted after
-- ~5–10 minutes of idle. 4 min gives a comfortable margin without being wasteful.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop any existing job with the same name so this migration is idempotent.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'keep-warm-edge-function') then
    perform cron.unschedule('keep-warm-edge-function');
  end if;
end
$$;

select cron.schedule(
  'keep-warm-edge-function',
  '*/4 * * * *',
  $$
    select net.http_get(
      url := 'https://mfztwitrkpmydxpwbmez.supabase.co/functions/v1/make-server-ce0d67b8/health',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menR3aXRya3BteWR4cHdibWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ4NTYsImV4cCI6MjA4MzQ1MDg1Nn0.jJWm4zkzQfBxmHuVDx3YFgCv9nFNiykeS3rN60RPGoM'
      ),
      timeout_milliseconds := 5000
    );
  $$
);
