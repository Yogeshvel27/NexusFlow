import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing in your environment configuration.");
}

// Default static client for general/public access
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// React hook to obtain a Supabase client authenticated with the Clerk JWT token
export function useSupabase() {
  const { getToken } = useAuth();

  const getAuthenticatedClient = async () => {
    const token = await getToken({ template: "supabase" });
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    });
  };

  return { getAuthenticatedClient };
}
