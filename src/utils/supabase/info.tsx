/* Edit .env.local (VITE_SUPABASE_PROJECT_ID / VITE_SUPABASE_ANON_KEY) to override. */

const PROD_PROJECT_ID = "mwfekmiyuiknmahflvom";
const PROD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13ZmVrbWl5dWlrbm1haGZsdm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMDAyOTMsImV4cCI6MjA5Mzg3NjI5M30.8t-tpR31hO1LZPsfZd4KQoW7s5YhBDprdO8fmT7HKlw";

export const projectId =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? PROD_PROJECT_ID;

export const publicAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? PROD_ANON_KEY;
