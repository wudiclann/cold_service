// NEXT_PUBLIC_* values are inlined into the browser bundle, so this is the same on server and client.
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const NOT_CONFIGURED_MESSAGE =
  "Supabase isn't set up yet. Add your keys to .env.local and restart the dev server.";
