(function () {
  "use strict";

  const SUPABASE_URL = "TON_SUPABASE_URL";
  const SUPABASE_ANON_KEY = "TON_SUPABASE_ANON_KEY";

  const isConfigured = Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("TON_SUPABASE_URL") &&
    !SUPABASE_ANON_KEY.includes("TON_SUPABASE_ANON_KEY")
  );

  window.djHubSupabaseConfig = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isConfigured
  };

  window.djHubSupabase = null;

  if (!isConfigured) {
    console.warn("[DJ-hub] Supabase n'est pas encore configuré. Remplacez TON_SUPABASE_URL et TON_SUPABASE_ANON_KEY dans assets/js/supabase-config.js.");
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.warn("[DJ-hub] Le client Supabase JS n'est pas chargé. Vérifiez l'ordre des scripts CDN.");
    return;
  }

  window.djHubSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
})();
