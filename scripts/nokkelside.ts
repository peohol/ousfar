/**
 * Bygger nøkkelsiden for kopiene i drift (`docs/drift-gjenoppretting.md`,
 * «Nøklene»): én HTML-fil uten eksterne skript, der nøkkeleieren lager
 * nøklene i sin egen nettleser med koden i `src/drift/sikkerhetskopi/nokler.ts`.
 *
 *   npm run sikkerhetskopi:nokkelside -- <ut.html>
 *
 * Siden har ingen nettverkskall (heller ikke skrifter) og lagrer ingenting;
 * nøklene finnes bare i fanen til den lukkes. En test holder den slik.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { PRODUKSJONSKOPI_PA } from '../src/drift/sikkerhetskopi/drift'

const ut = process.argv.slice(2).find((a) => a !== '--')
if (!ut) {
  console.error('Bruk: npm run sikkerhetskopi:nokkelside -- <ut.html>')
  process.exit(1)
}

const { outputFiles } = await build({
  entryPoints: [resolve(dirname(fileURLToPath(import.meta.url)), '../src/drift/sikkerhetskopi/nokkelsideKlient.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: false,
  write: false,
  legalComments: 'none',
})
const skript = outputFiles[0]!.text.replaceAll('</script', '<\\/script')

const MILJO = 'https://github.com/peohol/ousfar/settings/environments'

const side = /* html */ `<title>Kopinøklene til OUSFAR</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
  /* Én smal spalte med nummererte steg; nøklene står i monospace-felt med en kopiknapp hver. */
  :root {
    --bg: #f5f8f8; --flate: #ffffff; --tekst: #15282b; --dempet: #5a6d70; --kant: #d3dfe0;
    --aksent: #0b7f86; --aksent-tekst: #ffffff; --varsel: #8a4b00; --varsel-bg: #fdf3e4;
    /* Systemskrifter: siden henter ingenting fra nettet, heller ikke skrifter. */
    --tekstfont: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --monofont: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --bg: #0f1a1c; --flate: #16272a; --tekst: #e3eeef; --dempet: #9db1b4; --kant: #2b4246;
    --aksent: #4cc3c9; --aksent-tekst: #062024; --varsel: #f2b766; --varsel-bg: #2c2210; color-scheme: dark } }
  :root[data-theme="dark"] {
    --bg: #0f1a1c; --flate: #16272a; --tekst: #e3eeef; --dempet: #9db1b4; --kant: #2b4246;
    --aksent: #4cc3c9; --aksent-tekst: #062024; --varsel: #f2b766; --varsel-bg: #2c2210; color-scheme: dark }
  body { background: var(--bg); color: var(--tekst); font: 16px/1.6 var(--tekstfont);
    padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
  main { max-width: 44rem; margin: 0 auto; padding-block: 2.5rem 4rem; display: grid; gap: 2rem; }
  h1 { font-size: 1.75rem; line-height: 1.25; margin: 0; font-weight: 600; text-wrap: balance; }
  h2 { font-size: 1.125rem; margin: 0; font-weight: 600; display: flex; gap: .75rem; align-items: baseline; text-wrap: balance; }
  h2 .nr { flex: none; width: 1.75rem; height: 1.75rem; border-radius: 50%; display: inline-grid; place-items: center;
    background: var(--aksent); color: var(--aksent-tekst); font-size: .875rem; transform: translateY(-.1rem); }
  p, ol, ul { margin: 0; }
  .ingress { color: var(--dempet); max-width: 62ch; }
  section { display: grid; gap: .875rem; }
  .steg { background: var(--flate); border: 1px solid var(--kant); border-radius: 10px; padding: 1.25rem; display: grid; gap: .875rem; min-width: 0; }
  .merknad { background: var(--varsel-bg); color: var(--varsel); border-radius: 8px; padding: .75rem 1rem; font-size: .9375rem; }
  ol.liste, ul.liste { padding-left: 1.25rem; display: grid; gap: .375rem; }
  .felt { display: grid; gap: .375rem; min-width: 0; }
  .felt-topp { display: flex; justify-content: space-between; align-items: center; gap: .75rem; flex-wrap: wrap; }
  .navn { font-family: var(--monofont); font-size: .875rem; font-weight: 500; letter-spacing: .02em; }
  textarea { width: 100%; box-sizing: border-box; resize: vertical; font: .8125rem/1.5 var(--monofont); color: var(--tekst);
    background: var(--bg); border: 1px solid var(--kant); border-radius: 6px; padding: .625rem .75rem; }
  button { font: inherit; font-weight: 500; cursor: pointer; border-radius: 8px; border: 1px solid var(--aksent); }
  button:focus-visible, textarea:focus-visible, a:focus-visible { outline: 3px solid var(--aksent); outline-offset: 2px; }
  .hoved { background: var(--aksent); color: var(--aksent-tekst); padding: .75rem 1.25rem; justify-self: start; }
  .hoved:disabled { opacity: .6; cursor: default; }
  .kopier { background: transparent; color: var(--aksent); padding: .25rem .75rem; font-size: .875rem; }
  a { color: var(--aksent); }
  [hidden] { display: none !important; }
  code { font-family: var(--monofont); font-size: .875em; }
  .liten { font-size: .875rem; color: var(--dempet); }
</style>
<main>
  <header style="display:grid;gap:.75rem">
    <h1>Nøklene til sikkerhetskopiene</h1>
    <p class="ingress">Siden lager nøklene her i nettleseren din. De sendes ingen steder, lagres ikke, og blir borte når du lukker fanen. Gjør derfor alle stegene i én omgang, før du lukker eller laster siden på nytt.</p>
  </header>

  <section class="steg" id="start">
    <h2><span class="nr">1</span>Lag nøklene</h2>
    <p>Trykk på knappen. Det tar et øyeblikk.</p>
    <button class="hoved" id="lag" type="button">Lag nøklene</button>
    <p class="merknad" id="feil" hidden>Nettleseren kunne ikke lage nøklene. Åpne siden i en oppdatert Chrome, Edge, Firefox eller Safari og prøv igjen.</p>
  </section>

  <div id="resultat" hidden style="display:grid;gap:2rem">
    <section class="steg">
      <h2><span class="nr">2</span>Ta vare på nøkkelfila, to steder</h2>
      <p>Dette er den eneste nøkkelen som kan åpne kopiene. Mister du den, kan ingen kopi gjenopprettes. Kommer den på avveie, kan den som har den, lese kopiene.</p>
      <div class="felt">
        <div class="felt-topp"><span class="navn">Nøkkelfila</span><button class="kopier" type="button" data-kopier="nokkelfil">Kopier</button></div>
        <textarea id="nokkelfil" rows="10" readonly spellcheck="false" aria-label="Nøkkelfila"></textarea>
      </div>
      <ol class="liste">
        <li>Lim den inn i et sikkert notat i passordbehandleren din, for eksempel med navnet «OUSFAR kopinøkkel».</li>
        <li>Legg en kopi et annet sted som ikke henger sammen med det første, for eksempel skrevet ut og lagt i en safe, eller i passordbehandleren til den som har beredskapen.</li>
      </ol>
      <p class="merknad">Aldri i e-post, chat, GitHub, Backblaze eller en vanlig fil på maskinen.</p>
    </section>

    <section class="steg">
      <h2><span class="nr">3</span>Legg to hemmeligheter i GitHub</h2>
      <ol class="liste">
        <li>Åpne <a href="${MILJO}" target="_blank" rel="noopener">miljøene i GitHub</a> og velg <strong>backup</strong>.</li>
        <li>Under <strong>Environment secrets</strong>, trykk <strong>Add environment secret</strong>. Skriv navnet nøyaktig som nedenfor, lim inn verdien og trykk <strong>Add secret</strong>.</li>
        <li>Gjør det samme for den andre.</li>
      </ol>
      <div class="felt">
        <div class="felt-topp"><span class="navn">KOPI_MOTTAKERE</span><button class="kopier" type="button" data-kopier="mottakere">Kopier</button></div>
        <textarea id="mottakere" rows="2" readonly spellcheck="false" aria-label="Verdien til KOPI_MOTTAKERE"></textarea>
      </div>
      <div class="felt">
        <div class="felt-topp"><span class="navn">KOPI_SIGNERINGSNOKKEL</span><button class="kopier" type="button" data-kopier="signering">Kopier</button></div>
        <textarea id="signering" rows="4" readonly spellcheck="false" aria-label="Verdien til KOPI_SIGNERINGSNOKKEL"></textarea>
      </div>
      <p class="liten">Den første er den offentlige delen av nøkkelen i steg 2; den kan bare låse kopiene, ikke åpne dem. Den andre lar kopijobben signere kopiene, så en falsk kopi aldri kan gjenopprettes.</p>
    </section>

    <section class="steg">
      <h2><span class="nr">4</span>Lukk fanen</h2>
      <p>Når nøkkelfila ligger to steder og begge hemmelighetene er lagt inn, lukker du fanen og sier fra i OUSFAR-tråden at det er gjort.${PRODUKSJONSKOPI_PA ? '' : ' Kopieringen slås ikke på før det.'}</p>
    </section>
  </div>
</main>
<script>
${skript}
</script>
`

writeFileSync(ut, side)
console.log(`Nøkkelsiden er skrevet til ${ut}.`)
