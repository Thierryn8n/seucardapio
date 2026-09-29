import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Untyped view of the client for tables not yet in the generated Database types.
export const db = supabase as unknown as SupabaseClient;
