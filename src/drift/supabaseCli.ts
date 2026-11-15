/**
 * Supabase-CLI-en i fast versjon, så det lokale testmiljøet og
 * sikkerhetskopien bruker de samme bildene av Auth, Storage og Postgres fra
 * gang til gang.
 */
export const SUPABASE_CLI = ['-y', 'supabase@2.120.0']
