/// <reference types="vite/client" />

/**
 * Innstillingene appen leses med i nettleseren. Begge er offentlige: URL-en
 * til Supabase-prosjektet og den publiserbare nøkkelen. Hemmelige nøkler skal
 * aldri ligge i `VITE_`-variabler — de ville blitt med i bygget.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/*
 * Bygget og endringene med egen fil, med versjonene byggingen beregnet fra
 * Git (`versjonsfil()` i `vite.config.ts`). Les dem gjennom
 * `src/oppdatering/versjon.ts` og `src/data/endringslogg.ts`.
 */
declare module 'virtual:ousfar-bygg' {
  import type { Byggopplysninger } from 'src/oppdatering/byggopplysninger'
  export const BYGG: Byggopplysninger
}

declare module 'virtual:ousfar-endringer' {
  import type { Endring } from 'src/domain/versjon'
  export const NYE_ENDRINGER: readonly Endring[]
}
