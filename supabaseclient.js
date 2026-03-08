import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://umgwfemgagdbwdamvlnw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZ3dmZW1nYWdkYndkYW12bG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDI5NzYsImV4cCI6MjA4ODQ3ODk3Nn0._HQQr4TNPQF0Nk3G5YIax2j1tSrL0FJ4tjLN2UMr86M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);