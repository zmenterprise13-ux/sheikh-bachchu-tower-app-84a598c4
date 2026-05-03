
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedule with same name
SELECT cron.unschedule('generate-monthly-bills-on-first') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-bills-on-first');

SELECT cron.schedule(
  'generate-monthly-bills-on-first',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url:='https://ogurhyuwaurxxivwgqnx.supabase.co/functions/v1/generate-monthly-bills',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ndXJoeXV3YXVyeHhpdndncW54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTM3MTUsImV4cCI6MjA5MzIyOTcxNX0.2R7u7F9_4bYEDxVJZkBzPLCXkph1sLMC92dOWYTMfsk","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ndXJoeXV3YXVyeHhpdndncW54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTM3MTUsImV4cCI6MjA5MzIyOTcxNX0.2R7u7F9_4bYEDxVJZkBzPLCXkph1sLMC92dOWYTMfsk"}'::jsonb,
    body:='{"source":"pg_cron"}'::jsonb
  );
  $$
);
