import { createClient } from '@supabase/supabase-js';

// Os dois valores vêm dos GitHub Secrets, injetados no build pelo GitHub Actions.
const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_KEY;

// Se faltar algum, o app mostra uma tela explicando (em vez de quebrar).
export const cliente =
  url && chave
    ? createClient(url, chave, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 20 } },
      })
    : null;
