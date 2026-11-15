import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { KLINISK_PAKKE } from './src/auth/vegg'
import { systemvalgskript } from './src/domain/systemvalg'
import { medInnholdsregler } from './src/drift/sikkerhetshoder'
import { ENDRINGSLOGG } from './src/data/endringslogg'
import { endringsomrader, nyesteVersjon, oppdateringsversjon } from './src/domain/versjon'
import { VERSJONSFIL, type Byggopplysninger } from './src/oppdatering/versjon'

/**
 * Identiteten og versjonene til bygget, i appen som `__BYGG__` og i
 * `versjon.json` ved siden av `index.html`. Appen som kjører, spør etter fila
 * og ber brukeren oppdatere når en annen versjon er lagt ut
 * (`src/oppdatering/versjon.ts`). Bygget er commiten på Vercel; ellers
 * tidspunktet, så hvert lokale bygg er nytt. Fila sier også hvilke sider de
 * nyeste føringene gjelder; det trenger bare appen som spør, ikke den som
 * kjører.
 */
function versjonsfil(): Plugin {
  const opplysninger: Byggopplysninger = {
    bygg: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36),
    versjon: nyesteVersjon(ENDRINGSLOGG),
    oppdatering: oppdateringsversjon(ENDRINGSLOGG),
  }
  return {
    name: 'ousfar-versjonsfil',
    config: () => ({ define: { __BYGG__: JSON.stringify(opplysninger) } }),
    generateBundle() {
      const fil: Byggopplysninger = { ...opplysninger, endringer: endringsomrader(ENDRINGSLOGG) }
      this.emitFile({ type: 'asset', fileName: VERSJONSFIL, source: JSON.stringify(fil) })
    },
  }
}

/**
 * Temaet og «Reduser bevegelse» settes på `<html>` før noe tegnes, så siden
 * aldri blinker i feil tema. Skriptet lages fra samme beskrivelse som appen
 * bruker (`src/domain/systemvalg.ts`).
 */
function systemvalg(): Plugin {
  return {
    name: 'ousfar-systemvalg',
    transformIndexHtml: () => [{ tag: 'script', children: systemvalgskript(), injectTo: 'head' }],
  }
}

/**
 * Sikkerhetsreglene for siden (`src/drift/sikkerhetshoder.ts`), lagt inn i
 * `index.html` når den er ferdig, så de innebygde skriptene den har da, får
 * sin sum, og Supabase-adressen bygget bruker, er den ene som er tillatt.
 * Bare i bygget: utviklingstjeneren legger inn egne skript underveis.
 */
function sikkerhetsregler(): Plugin {
  let supabaseUrl: string | undefined
  return {
    name: 'ousfar-sikkerhetsregler',
    apply: 'build',
    configResolved: (config) => {
      supabaseUrl = config.env.VITE_SUPABASE_URL as string | undefined
    },
    transformIndexHtml: { order: 'post', handler: (html) => medInnholdsregler(html, supabaseUrl) },
  }
}

/**
 * Oppsettet for Vitest. Testene ser samme miljø som i CI, uten
 * produksjonsadressen og -nøklene (`src/__tests__/hjelp/utenProduksjon.ts`).
 * Det står for seg fordi Vitest har sin egen utgave av Vite-typene.
 */
const testoppsett = {
  test: { setupFiles: ['./src/__tests__/hjelp/utenProduksjon.ts'] },
}

export default defineConfig({
  plugins: [react(), versjonsfil(), systemvalg(), sikkerhetsregler()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        /**
         * Den kliniske delen av appen får et fast navn, slik at
         * innloggingsveggen på kanten kjenner den igjen. Hvilke moduler som
         * havner der, avgjør Rollup selv: alt som bare `App` trenger, følger
         * med den, mens det innloggingssiden også bruker, blir liggende igjen
         * utenfor veggen. `npm run build` kontrollerer at delingen ble riktig.
         */
        chunkFileNames: (pakke) =>
          pakke.facadeModuleId?.endsWith('/src/App.tsx')
            ? `assets/${KLINISK_PAKKE}-[hash].js`
            : 'assets/[name]-[hash].js',
        /**
         * Rikteksteditoren (TipTap og ProseMirror) er et stort bibliotek uten
         * noe faglig innhold, og får sin egen pakke i stedet for å gjøre den
         * kliniske tung. Det er bare kode fra `node_modules` her; kontrollen
         * av veggen slår ut om noe av vårt eget havner i den.
         */
        manualChunks: (id) =>
          /\/node_modules\/(@tiptap\/(?!react)|prosemirror-|orderedmap|rope-sequence|w3c-keyname|linkifyjs)/.test(id)
            ? 'riktekstbibliotek'
            : undefined,
      },
    },
  },
  ...testoppsett,
  resolve: {
    alias: {
      // Reglene for brukernavn, passord og profilfelter deles med
      // Edge-funksjonene. Kilden ligger hos funksjonene, som importerer den
      // med relativ sti; appen når den gjennom dette navnet.
      '@delt': fileURLToPath(new URL('./supabase/functions/_delt', import.meta.url)),
    },
  },
})
