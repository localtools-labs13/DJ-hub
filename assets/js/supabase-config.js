(function () {
  "use strict";

  // DJ-hub — Configuration Supabase
  // Clé publique uniquement : ne jamais mettre de clé serveur privée ici.

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
    isConfigured: isConfigured
  };

  window.djHubSupabase = null;

  if (!isConfigured) {
    console.warn("[DJ-hub] Supabase n'est pas encore configuré. Vérifiez assets/js/supabase-config.js.");
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.warn("[DJ-hub] Le client Supabase JS n'est pas chargé. Vérifiez l'ordre des scripts.");
    return;
  }

  window.djHubSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  console.log("[DJ-hub] Supabase configuré correctement.");
})();
