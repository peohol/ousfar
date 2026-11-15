/**
 * Sikkerhetsreglene nettleseren får for appen (`docs/s4-pilotplan.md` tiltak 5).
 *
 * To deler, fordi de hører hjemme på to steder:
 *
 * - {@link FASTE_HODER} er de samme for alle bygg og står som HTTP-hoder i
 *   `vercel.json`: at appen ikke kan vises i en ramme på et annet nettsted,
 *   ingen gjetting av filtyper, ingen adresser i `Referer` til andre nettsteder
 *   og ingen tilgang til kamera, mikrofon og lignende. En test holder
 *   `vercel.json` lik dem.
 * - {@link innholdsregler} avhenger av bygget: hvilken Supabase appen snakker
 *   med, og de innebygde skriptene i `index.html`. Byggesteget i
 *   `vite.config.ts` legger dem inn øverst i `index.html` som
 *   `<meta http-equiv="Content-Security-Policy">` ({@link medInnholdsregler}),
 *   så bare appens egne filer og den ene Supabase-adressen er tillatt.
 *
 * Stilene tillater `'unsafe-inline'`, fordi redigeringsfeltet (Tiptap) og
 * bildebeskjæringen legger inn sine egne stiler. Skript gjør det aldri: et
 * innebygd skript er bare tillatt med sin sha256-sum.
 */
import { createHash } from 'node:crypto'

/** HTTP-hodene på alle svar, som i `vercel.json`. */
export const FASTE_HODER: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()',
}

/** sha256-summen et innebygd skript tillates med. */
export const skriptsum = (innhold: string) => `'sha256-${createHash('sha256').update(innhold, 'utf8').digest('base64')}'`

/**
 * Reglene for hva siden kan laste og koble seg til. `supabaseUrl` er
 * adressen appen er bygd mot; uten den kan appen bare snakke med seg selv.
 */
export function innholdsregler(supabaseUrl: string | undefined, innebygdeSkript: readonly string[]): string {
  const supabase = supabaseUrl ? new URL(supabaseUrl) : undefined
  const sanntid = supabase && `${supabase.protocol === 'https:' ? 'wss:' : 'ws:'}//${supabase.host}`
  const regler: [string, ...(string | undefined)[]][] = [
    ['default-src', "'self'"],
    ['script-src', "'self'", ...innebygdeSkript.map(skriptsum)],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:', supabase?.origin],
    ['font-src', "'self'", 'data:'],
    ['connect-src', "'self'", supabase?.origin, sanntid],
    ['worker-src', "'self'", 'blob:'],
    ['frame-src', "'none'"],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
  ]
  return regler.map((r) => r.filter(Boolean).join(' ')).join('; ')
}

const INNEBYGD_SKRIPT = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi

/** `index.html` med reglene først i `<head>` (etter tegnsettet), beregnet fra de innebygde skriptene som står i den. */
export function medInnholdsregler(html: string, supabaseUrl: string | undefined): string {
  const skript = [...html.matchAll(INNEBYGD_SKRIPT)].map((m) => m[1]!).filter((s) => s.trim())
  const regler = innholdsregler(supabaseUrl, skript).replaceAll('"', '&quot;')
  const meta = `<meta http-equiv="Content-Security-Policy" content="${regler}" />`
  // Rett etter tegnsettet, som skal stå først, og før alt annet siden laster.
  const forankring = /<meta\s+charset[^>]*>/i.test(html) ? /<meta\s+charset[^>]*>/i : /<head[^>]*>/i
  if (!forankring.test(html)) throw new Error('index.html har ingen <head>; sikkerhetsreglene kan ikke legges inn.')
  return html.replace(forankring, (m) => `${m}\n    ${meta}`)
}
