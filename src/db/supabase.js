// =====================
// Supabase Configuration
// =====================

import { createClient } from "@supabase/supabase-js";

// Supabase project credentials
const SUPABASE_URL = "https://gyzrddwuctcsldrvdgfb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kTWfDaA7a3WUqkhgVE1q0w_HFTO_z1g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
