import { projectId } from './supabase/info';

// Centralized API configuration.
// Override via VITE_API_BASE_URL in .env.local to point at a local Supabase stack
// (e.g. http://127.0.0.1:54321/functions/v1/server-v2).
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  `https://${projectId}.supabase.co/functions/v1/server-v2`;
