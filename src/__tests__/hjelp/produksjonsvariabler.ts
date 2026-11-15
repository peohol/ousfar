/**
 * Miljøvariablene som peker på eller gir tilgang til produksjonen, og som
 * testene derfor aldri skal se (`utenProduksjon.ts`).
 */
export const PRODUKSJONSVARIABLER = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_DB_URL',
  'OUSFAR_TESTBRUKER',
  'OUSFAR_TESTPASSORD',
] as const
