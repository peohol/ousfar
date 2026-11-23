import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { KLINISK_PAKKE } from './src/auth/vegg'
// @ts-expect-error - byggeskriptet er vanlig JavaScript uten typer.
import { APNE_MODULER } from './scripts/kontroller-vegg.mjs'
import { systemvalgskript } from './src/domain/systemvalg'
import { medInnholdsregler } from './src/drift/sikkerhetshoder'
import { HISTORISKE_ENDRINGER } from './src/data/endringshistorikk'
import { beregnNyeEndringer, ENDRINGSMAPPE } from './src/drift/endringshistorikk'
import { ENDRINGSMODUL, registermodul, sidemodul, sidenummer } from './src/drift/endringsmoduler'
import { endringsomrader, nyesteVersjon, oppdateringsversjon, type Endring } from './src/domain/versjon'
import { settSammen } from './src/domain/versjonering'
import { VERSJONSFIL, type Byggopplysninger } from './src/oppdatering/byggopplysninger'

/**
 * Modulene appen leser bygget og de nummererte endringene fra. De er to, så
 * opplysningene om bygget kan nå innloggingssiden uten at endringsloggen
 * følger med utenfor innloggingsveggen. Endringsloggen har i tillegg én modul
 * per side, som appen henter når den vises (`src/drift/endringsmoduler.ts`).
 */
const MODULER = { bygg: 'virtual:ousfar-bygg', endringer: ENDRINGSMODUL } as const

/** Det frosne arkivet over de eldre føringene, som bare byggingen leser. */
const ARKIVFIL = '/src/data/endringshistorikk.ts'

/** Sant for modulene byggingen lager selv. */
const erVirtuell = (id: string) => Object.values(MODULER).includes(id as never) || sidenummer(id) !== null

/**
 * Identiteten og versjonene til bygget, i appen som `BYGG` og i
 * `versjon.json` ved siden av `index.html`. Appen som kjører, spør etter fila
 * og ber brukeren oppdatere når en annen versjon er lagt ut
 * (`src/oppdatering/versjon.ts`). Bygget er commiten på Vercel; ellers
 * tidspunktet, så hvert lokale bygg er nytt. Fila sier også hvilke sider de
 * nyeste føringene gjelder, og hvor den kliniske delen av bygget ligger; det
 * trenger bare appen som spør, ikke den som kjører.
 *
 * Versjonene til endringene med egen fil beregnes her, fra rekkefølgen de ble
 * slått sammen i `main` (`src/drift/endringshistorikk.ts`), og legges inn i
 * appen som en ferdig modul. Nettleseren spør ikke GitHub om noe. Kan
 * versjonen ikke beregnes sikkert, stopper byggingen. Beregningen gjøres først
 * når appen trenger den, så skript som bare bruker oppsettet, ikke leser Git.
 */
function versjonsfil(): Plugin {
  const rot = fileURLToPath(new URL('.', import.meta.url))
  // Uten det vanlige `\0` foran: da står modulene med navn i kildekartene, og
  // kontrollen av innloggingsveggen (`scripts/kontroller-vegg.mjs`) ser hvor de havnet.
  const virtuell = (id: string) => id
  let beregnet: { logg: Endring[]; bygg: Byggopplysninger } | undefined
  const beregn = () => {
    if (beregnet) return beregnet
    const nye = beregnNyeEndringer(rot)
    const logg = settSammen(nye, HISTORISKE_ENDRINGER)
    const bygg: Byggopplysninger = {
      bygg: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36),
      versjon: nyesteVersjon(logg),
      oppdatering: oppdateringsversjon(logg),
    }
    return (beregnet = { logg, bygg })
  }
  return {
    name: 'ousfar-versjonsfil',
    resolveId: (id) => (erVirtuell(id) ? virtuell(id) : undefined),
    load(id) {
      if (id === virtuell(MODULER.bygg)) return `export const BYGG = ${JSON.stringify(beregn().bygg)}\n`
      if (id === virtuell(MODULER.endringer)) return registermodul(beregn().logg)
      const side = sidenummer(id)
      return side === null ? undefined : sidemodul(beregn().logg, side)
    },
    // I utviklingsserveren: en ny eller endret endringsfil gir ny nummerering med en gang.
    configureServer(server) {
      const mappe = join(rot, ENDRINGSMAPPE)
      server.watcher.add(mappe)
      server.watcher.on('all', (_hendelse, fil) => {
        if (!fil.startsWith(mappe)) return
        beregnet = undefined
        for (const node of server.moduleGraph.idToModuleMap.values()) {
          if (node.id && erVirtuell(node.id)) server.moduleGraph.invalidateModule(node)
        }
        server.ws.send({ type: 'full-reload' })
      })
    },
    generateBundle(_valg, pakker) {
      const { logg, bygg } = beregn()
      // Arkivet er stort, og appen skal få loggen bare gjennom sidene den
      // henter når loggen vises. Importerer appen det direkte, er alt med.
      for (const p of Object.values(pakker)) {
        if (p.type === 'chunk' && p.moduleIds.some((id) => id.endsWith(ARKIVFIL))) {
          this.error(`${ARKIVFIL} er med i ${p.fileName}. Appen skal lese endringsloggen gjennom src/data/endringslogg.ts.`)
        }
      }
      // Hoveddelen, den med `App`; sidene den henter senere, hentes når de vises.
      const klinisk = Object.values(pakker).find(
        (p) => p.type === 'chunk' && medApp(p.moduleIds),
      )?.fileName
      const fil: Byggopplysninger = { ...bygg, endringer: endringsomrader(logg), ...(klinisk && { klinisk }) }
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

/** Sant for pakken med `App`, hoveddelen av den kliniske appen. */
const medApp = (moduler: readonly string[]) => moduler.some((id) => id.endsWith('/src/App.tsx'))

/** Rotmappen, så modulene kan sammenlignes med stiene i `APNE_MODULER`. */
const ROT = fileURLToPath(new URL('.', import.meta.url))

/**
 * Sant når pakken har egen kode som ikke er ført opp som åpen: den skal bak
 * innloggingsveggen. Kode fra `node_modules` og Vites egne hjelpere er ikke
 * vår, og avgjør ingenting.
 */
function bakVeggen(moduler: readonly string[]): boolean {
  const apne = APNE_MODULER as Map<string, string>
  return moduler.some((id) => {
    if (id.startsWith('\0') || id.includes('/node_modules/')) return false
    const sti = (id.startsWith(ROT) ? id.slice(ROT.length) : id).split('?')[0]!
    return !apne.has(sti)
  })
}

/**
 * Oppsettet for Vitest. Testene ser samme miljø som i CI, uten
 * produksjonsadressen og -nøklene (`src/__tests__/hjelp/utenProduksjon.ts`).
 * Det står for seg fordi Vitest har sin egen utgave av Vite-typene.
 */
const testoppsett = {
  test: {
    setupFiles: ['./src/__tests__/hjelp/utenProduksjon.ts'],
    // Noen kontroller av katalogene og migrasjonene regner synkront i 5–30 s.
    // Vitest 2 lot slike gå forbi grensen på 5 s; Vitest 5 håndhever den.
    // Grensen gjelder også en test som henger, som da stoppes etter ett minutt.
    testTimeout: 60_000,
    // Det samme gjelder før- og etterarbeid, som oppryddingen av testdatabasene
    // på en travel CI-server (standardgrensen er 10 s).
    hookTimeout: 60_000,
  },
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
         * innloggingsveggen på kanten kjenner den igjen. Det gjelder `App`
         * og hver pakke den henter når en side først vises
         * (`src/oppdatering/senere.ts`): alt med egen kode som ikke er ført
         * opp som åpen i `scripts/kontroller-vegg.mjs`, havner bak veggen.
         * Hvilke moduler som havner i hvilken pakke, avgjør Rollup selv.
         * `npm run build` kontrollerer at delingen ble riktig, også at
         * innloggingssiden ikke trenger noe bak veggen.
         */
        chunkFileNames: (pakke) =>
          medApp(pakke.moduleIds)
            ? `assets/${KLINISK_PAKKE}-[hash].js`
            : bakVeggen(pakke.moduleIds)
              ? `assets/${KLINISK_PAKKE}-[name]-[hash].js`
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
