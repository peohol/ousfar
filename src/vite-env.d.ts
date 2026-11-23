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
 * Bygget og endringsloggen, med versjonene byggingen beregnet fra Git
 * (`versjonsfil()` i `vite.config.ts`, `src/drift/endringsmoduler.ts`). Les
 * dem gjennom `src/oppdatering/versjon.ts` og `src/data/endringslogg.ts`.
 */
declare module 'virtual:ousfar-bygg' {
  import type { Byggopplysninger } from 'src/oppdatering/byggopplysninger'
  export const BYGG: Byggopplysninger
}

declare module 'virtual:ousfar-endringer' {
  import type { Endring, Endringsmerke } from 'src/domain/versjon'
  /** Et merke per føring, nyest først. */
  export const REGISTER: readonly Endringsmerke[]
  /** Hele føringene som varsles i bjella, nyest først. */
  export const VARSLEDE: readonly Endring[]
  /** Hentingen av hver side, fra den eldste (`src/domain/endringssider.ts`). */
  export const SIDER: readonly (() => Promise<{ ENDRINGER: readonly Endring[] }>)[]
}
