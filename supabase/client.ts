import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types';

const supabaseUrl = 'https://ndjaufwwbtekysvrmhwm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kamF1Znd3YnRla3lzdnJtaHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NzE1MTEsImV4cCI6MjA2MTE0NzUxMX0.jYo4D1iKYRqqO52AeOJcq2pipdzrFF5EPKBUZhij-fU';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
