-- 0011_keep_warm_fix.sql
-- The cron job created in 0006 was pointing at the OLD project's edge function
-- (mfztwitrkpmydxpwbmez / make-server-ce0d67b8). That meant the new server-v2
-- isolate never received keep-warm pings and cold-started on every idle period,
-- adding 1-3s to the first request after a quiet window. Repoint at server-v2
-- on the current project.

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
      url := 'https://mwfekmiyuiknmahflvom.supabase.co/functions/v1/server-v2/health',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZmVrbWl5dWlrbm1haGZsdm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDAyOTMsImV4cCI6MjA5Mzg3NjI5M30.8t-tpR31hO1LZPsfZd4KQoW7s5YhBDprdO8fmT7HKlw'
      ),
      timeout_milliseconds := 5000
    );
  $$
);
