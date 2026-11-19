/**
 * Kontrollen «Prosjektansvar» (`docs/prosjektansvar.md`): hver PR har ett
 * prosjekt og én ansvarlig systemarkitekt, og de samme står på Issue-et med
 * arbeidsoppgaven.
 *
 * - Prosjektet er nøyaktig én prosjektetikett (`ansvar:dev`, `ansvar:fag` eller
 *   `ansvar:verktoy`). Den avgjør hvilket ChatGPT-prosjekt som kontrollerer.
 * - Personen er nøyaktig én assignee, en av systemarkitektene. Den avgjør
 *   hvem sitt ChatGPT-prosjekt det er. PR-forfatteren, grennavnet og navn i
 *   fritekst teller ikke.
 * - Arbeidsoppgaven er Issue-et PR-en viser til under «## Arbeidsoppgave».
 *   Det skal ha den samme prosjektetiketten og den samme ene assignee-en.
 *
 * Kontrollen ser bare på merkingen, ikke på om den er riktig: det vurderer den
 * som kontrollerer PR-en. Prosjektene og systemarkitektene står i
 * `.github/prosjektansvar.json`. Kravene om ansvarlig og arbeidsoppgave gjelder
 * PR-er som er opprettet etter at den fila kom på standardgrenen; eldre PR-er
 * får bare en advarsel, så de kan fullføres slik de ble startet. Fila må derfor
 * ikke flyttes.
 *
 * To kjøremåter, begge fra `.github/workflows/`:
 * - `node scripts/prosjektansvar.mjs` (prosjektansvar.yml): vurderer PR-en i
 *   hendelsen. Den henter alltid ny tilstand fra GitHub, så en ny kjøring av
 *   en gammel hendelse vurderer PR-en og Issue-et slik de er nå.
 * - `node scripts/prosjektansvar.mjs sak` (prosjektansvar-sak.yml): når et
 *   Issue får ny ansvarlig eller etikett, kjøres kontrollen på nytt for alle
 *   åpne PR-er som viser til det, så en grønn kontroll aldri blir stående på
 *   foreldet grunnlag.
 *
 * Vanlig JavaScript uten avhengigheter: arbeidsflytene trenger verken `npm ci`
 * eller hemmeligheter, bare lesetilgang (og rett til å starte kontrollen på
 * nytt i `sak`).
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Fila med prosjektene og systemarkitektene, fra repoets rot. */
export const REGLER_STI = '.github/prosjektansvar.json'
/** Arbeidsflyten med selve kontrollen, som `sak` starter på nytt. */
export const KONTROLLFLYT = 'prosjektansvar.yml'

/** Leser og sjekker `.github/prosjektansvar.json`. */
export function lesRegler(tekst = readFileSync(new URL(`../${REGLER_STI}`, import.meta.url), 'utf8')) {
  const { prosjekter, systemarkitekter } = JSON.parse(tekst)
  const ordbok = (verdi, hva) => {
    if (!verdi || typeof verdi !== 'object' || Array.isArray(verdi) || Object.keys(verdi).length === 0) throw new Error(`${REGLER_STI}: «${hva}» mangler eller er tom.`)
    for (const [nøkkel, navn] of Object.entries(verdi)) if (!nøkkel.trim() || typeof navn !== 'string' || !navn.trim()) throw new Error(`${REGLER_STI}: ugyldig «${hva}»: ${nøkkel}.`)
    return new Map(Object.entries(verdi))
  }
  const regler = { prosjekter: ordbok(prosjekter, 'prosjekter'), systemarkitekter: ordbok(systemarkitekter, 'systemarkitekter') }
  for (const etikett of regler.prosjekter.keys()) if (!etikett.startsWith(PREFIKS)) throw new Error(`${REGLER_STI}: prosjektetiketten ${etikett} skal begynne med ${PREFIKS}.`)
  return regler
}

/** Alt som begynner slik, regnes som et forsøk på prosjektetikett, også en feilstavet. */
const PREFIKS = 'ansvar:'
const REGLER = lesRegler()
/** De gyldige etikettene og prosjektet hver av dem gir ansvaret til. */
export const PROSJEKTETIKETTER = REGLER.prosjekter
/** GitHub-brukerne som kan være ansvarlige, med navnet de har i meldingene. */
export const SYSTEMARKITEKTER = REGLER.systemarkitekter

const PAA_NYTT = 'Kontrollen kjøres på nytt når PR-en eller Issue-et endres.'
const DOK = 'docs/prosjektansvar.md'
const oppramsing = (liste) => (liste.length < 2 ? liste.join('') : `${liste.slice(0, -1).join(', ')} eller ${liste.at(-1)}`)
const unike = (liste) => [...new Set(liste.map((e) => e.trim()))]
const person = (login, regler) => `${regler.systemarkitekter.get(login) ?? login} (${login})`

/**
 * Vurderer prosjektetikettene på en PR eller et Issue.
 * @param {string[]} etiketter Navnene på alle etikettene.
 * @returns {{ ok: true, etikett: string, prosjekt: string, melding: string } | { ok: false, melding: string }}
 */
export function vurderEtiketter(etiketter, regler = REGLER, hvem = 'PR-en') {
  const forsok = unike(etiketter).filter((e) => e.toLowerCase().startsWith(PREFIKS))
  const gyldige = oppramsing([...regler.prosjekter.keys()])
  const retting = `Sett nøyaktig én av ${gyldige}, etter hvilket prosjekt som eier oppgaven (${DOK}). ${PAA_NYTT}`
  if (forsok.length === 0) return { ok: false, melding: `${hvem} mangler prosjektetikett. ${retting}` }
  if (forsok.length > 1) {
    return { ok: false, melding: `${hvem} har ${forsok.length} prosjektetiketter (${forsok.join(', ')}), men skal ha nøyaktig én. Behold bare etiketten til prosjektet som eier oppgaven (${DOK}). ${PAA_NYTT}` }
  }
  const [etikett] = forsok
  const prosjekt = regler.prosjekter.get(etikett)
  if (!prosjekt) return { ok: false, melding: `«${etikett}» er ikke en gyldig prosjektetikett. ${retting}` }
  return { ok: true, etikett, prosjekt, melding: `${prosjekt} eier ${hvem} (${etikett}).` }
}

/**
 * Vurderer assignee-feltet: nøyaktig én, og en av systemarkitektene.
 * @param {string[]} ansvarlige GitHub-brukerne som er satt som assignee.
 */
export function vurderAnsvarlige(ansvarlige, regler = REGLER, hvem = 'PR-en') {
  const liste = unike(ansvarlige)
  const lovlige = oppramsing([...regler.systemarkitekter.keys()])
  const retting = `Sett nøyaktig én assignee: systemarkitekten som har oppgaven (${lovlige}). Et navn i teksten teller ikke (${DOK}). ${PAA_NYTT}`
  if (liste.length === 0) return { ok: false, melding: `${hvem} har ingen ansvarlig. ${retting}` }
  if (liste.length > 1) return { ok: false, melding: `${hvem} har ${liste.length} ansvarlige (${liste.join(', ')}), men skal ha nøyaktig én. Behold bare systemarkitekten som har oppgaven. ${PAA_NYTT}` }
  const [login] = liste
  if (!regler.systemarkitekter.has(login)) return { ok: false, melding: `${login} er ikke en av systemarkitektene i ${REGLER_STI}. ${retting}` }
  return { ok: true, login, melding: `${person(login, regler)} er ansvarlig.` }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Finner Issue-numrene PR-beskrivelsen viser til under «## Arbeidsoppgave»:
 * `#12`, `Refs #12`, `Closes #12`, `eier/repo#12` eller lenken til Issue-et.
 * Kommentarer i malen og henvisninger andre steder i teksten teller ikke.
 */
export function arbeidsoppgaver(tekst, repo) {
  const del = (tekst ?? '').replace(/<!--[\s\S]*?-->/g, '').split(/^##[ \t]+/m).find((d) => /^Arbeidsoppgave\b/i.test(d))
  if (!del) return []
  const [eier, navn] = repo.split('/').map(esc)
  const mønster = new RegExp(`(?:https://github\\.com/${eier}/${navn}/issues/|(?<![\\w/.-])${eier}/${navn}#|(?<![\\w/&])#)(\\d+)\\b`, 'gi')
  return [...new Set([...del.matchAll(mønster)].map((m) => Number(m[1])))]
}

/**
 * Vurderer en PR med Issue-ene den viser til.
 * @param {object} a
 * @param {{ nummer: number, opprettet: string, tekst: string, etiketter: string[], ansvarlige: string[] }} a.pr
 * @param {Map<number, { erPr: boolean, etiketter: string[], ansvarlige: string[], opprettetAv?: string, viaApp?: boolean } | null>} a.saker
 *   Issue-ene, med `null` for et nummer som ikke er et Issue i repoet.
 * @param {string | null} a.aktivertKl Da kravet om ansvarlig og arbeidsoppgave
 *   begynte å gjelde, eller `null` når det ennå ikke gjelder.
 * @param {string} a.repo `eier/navn`.
 * @returns {{ ok: boolean, overgang: boolean, feil: string[], advarsler: string[], melding: string }}
 */
export function vurderPr({ pr, saker, aktivertKl, repo, regler = REGLER }) {
  const etikett = vurderEtiketter(pr.etiketter, regler)
  const ansvar = vurderAnsvarlige(pr.ansvarlige, regler)
  const numre = arbeidsoppgaver(pr.tekst, repo)
  const eierskap = []
  if (!ansvar.ok) eierskap.push(ansvar.melding)
  if (numre.length === 0) {
    eierskap.push(`PR-en viser ikke til en arbeidsoppgave. Skriv «Refs #N» (eller «Closes #N» når PR-en fullfører oppgaven) under «## Arbeidsoppgave» i beskrivelsen, der #N er Issue-et med oppgaven. ${PAA_NYTT}`)
  }
  for (const nummer of numre) {
    const sak = saker.get(nummer)
    if (!sak) {
      eierskap.push(`#${nummer} under «Arbeidsoppgave» er ikke et Issue i ${repo}. Vis til Issue-et med oppgaven.`)
      continue
    }
    if (sak.erPr) {
      eierskap.push(`#${nummer} under «Arbeidsoppgave» er en PR, ikke et Issue. Vis til Issue-et med oppgaven.`)
      continue
    }
    const sakEtikett = vurderEtiketter(sak.etiketter, regler, `Issue #${nummer}`)
    if (!sakEtikett.ok) eierskap.push(sakEtikett.melding)
    else if (etikett.ok && sakEtikett.etikett !== etikett.etikett) {
      eierskap.push(`Issue #${nummer} har prosjektetiketten ${sakEtikett.etikett}, men PR-en ${etikett.etikett}. De skal være like: rett den som er feil (${DOK}).`)
    }
    const sakAnsvar = vurderAnsvarlige(sak.ansvarlige, regler, `Issue #${nummer}`)
    if (!sakAnsvar.ok) {
      const forslag = sak.ansvarlige.length === 0 && !sak.viaApp && regler.systemarkitekter.has(sak.opprettetAv ?? '')
        ? ` Det ble opprettet direkte i GitHub av ${person(sak.opprettetAv, regler)}.`
        : ''
      eierskap.push(`${sakAnsvar.melding}${forslag}`)
    } else if (ansvar.ok && sakAnsvar.login !== ansvar.login) {
      eierskap.push(`Issue #${nummer} er tildelt ${sakAnsvar.login}, men PR-en ${ansvar.login}. Ansvarlig skal være den samme; ved en overføring endres begge (${DOK}).`)
    }
  }

  const overgang = !aktivertKl || Date.parse(pr.opprettet) < Date.parse(aktivertKl)
  const feil = [...(etikett.ok ? [] : [etikett.melding]), ...(overgang ? [] : eierskap)]
  const advarsler = overgang
    ? eierskap.map((m) => `PR-en ble opprettet før kravet om ansvarlig og arbeidsoppgave gjaldt, og kan fullføres uten. ${m}`)
    : []
  const ok = feil.length === 0
  let melding
  if (!ok) melding = feil.join('\n')
  else if (eierskap.length === 0) {
    const sakliste = oppramsing(numre.map((n) => `#${n}`))
    melding = `${etikett.prosjekt} eier PR-en (${etikett.etikett}), og ${person(ansvar.login, regler)} er ansvarlig etter Issue ${sakliste}. Den kontrolleres av ChatGPT-prosjektet ${etikett.prosjekt} med «GitHub-ansvarlig: ${ansvar.login}».`
  } else {
    melding = `${etikett.prosjekt} eier PR-en (${etikett.etikett}) og kontrollerer den i ChatGPT-prosjektet ${etikett.prosjekt}.`
  }
  return { ok, overgang, feil, advarsler, melding }
}

// ---------------------------------------------------------------- GitHub

/** En liten klient for GitHubs REST-API. `null` når noe ikke finnes (404/410). */
export function lagGithub({ token, fetch = globalThis.fetch, api = 'https://api.github.com' }) {
  return async function github(sti, { metode = 'GET', finnes = false } = {}) {
    const svar = await fetch(`${api}/${sti}`, {
      method: metode,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ousfar-prosjektansvar',
      },
    })
    if (finnes && (svar.status === 404 || svar.status === 410)) return null
    if (!svar.ok) throw new Error(`GitHub svarte ${svar.status} på ${metode} ${sti}: ${(await svar.text()).slice(0, 300)}`)
    const tekst = await svar.text()
    return tekst ? JSON.parse(tekst) : null
  }
}

/** Alle elementene i en liste fra GitHub, side for side. */
export async function alle(github, sti) {
  const resultat = []
  for (let side = 1; ; side++) {
    const liste = await github(`${sti}${sti.includes('?') ? '&' : '?'}per_page=100&page=${side}`)
    resultat.push(...liste)
    if (liste.length < 100) return resultat
  }
}

/** PR-en slik kontrollen trenger den. */
export const somPr = (pr) => ({
  nummer: pr.number,
  opprettet: pr.created_at,
  tekst: pr.body ?? '',
  etiketter: pr.labels.map((l) => l.name),
  ansvarlige: pr.assignees.map((a) => a.login),
})

/** Issue-et slik kontrollen trenger det, eller `null` når det ikke (lenger) er i repoet. */
export function somSak(sak, repo) {
  if (!sak || !sak.repository_url?.toLowerCase().endsWith(`/repos/${repo.toLowerCase()}`)) return null
  return {
    erPr: Boolean(sak.pull_request),
    etiketter: sak.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    ansvarlige: sak.assignees.map((a) => a.login),
    opprettetAv: sak.user?.login,
    viaApp: Boolean(sak.performed_via_github_app),
  }
}

/**
 * Da kravet om ansvarlig og arbeidsoppgave begynte å gjelde: da `REGLER_STI`
 * kom på standardgrenen (den eldste commiten der som endrer fila), eller
 * `null` hvis den ikke er der ennå.
 */
export async function hentAktivering(github, repo, gren) {
  const commits = await alle(github, `repos/${repo}/commits?sha=${encodeURIComponent(gren)}&path=${encodeURIComponent(REGLER_STI)}`)
  return commits.at(-1)?.commit.committer.date ?? null
}

/** Vurderer PR-en med ny tilstand fra GitHub. */
export async function kontrollerPr(github, repo, nummer, gren) {
  const pr = somPr(await github(`repos/${repo}/pulls/${nummer}`))
  const saker = new Map()
  for (const n of arbeidsoppgaver(pr.tekst, repo)) saker.set(n, somSak(await github(`repos/${repo}/issues/${n}`, { finnes: true }), repo))
  return vurderPr({ pr, saker, aktivertKl: await hentAktivering(github, repo, gren), repo })
}

const vent = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Starter kontrollen på nytt for hver åpne PR som viser til Issue-et. Venter på
 * en kjøring som pågår, så den nye kjøringen ser endringen. Går det ikke for en
 * PR, fortsetter den med de andre og feiler til slutt, så det synes i Actions.
 * @returns {Promise<string[]>} Én linje per PR om hva som ble gjort.
 */
export async function kontrollerSakensPrer(github, repo, sak, { pause = 10_000, forsok = 18 } = {}) {
  const prer = (await alle(github, `repos/${repo}/pulls?state=open`)).filter((pr) => arbeidsoppgaver(pr.body, repo).includes(sak))
  const logg = []
  const feil = []
  for (const pr of prer) {
    try {
      const finn = async () => (await github(`repos/${repo}/actions/workflows/${KONTROLLFLYT}/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=1`)).workflow_runs[0]
      let kjoring = await finn()
      for (let i = 0; kjoring && kjoring.status !== 'completed' && i < forsok; i++) {
        await vent(pause)
        kjoring = await finn()
      }
      if (!kjoring) {
        logg.push(`#${pr.number}: kontrollen har ikke kjørt på ${pr.head.sha.slice(0, 7)} ennå; den kjører ved neste endring av PR-en.`)
        continue
      }
      if (kjoring.status !== 'completed') throw new Error(`kontrollen ${kjoring.html_url} ble ikke ferdig, så den kunne ikke startes på nytt`)
      await github(`repos/${repo}/actions/runs/${kjoring.id}/rerun`, { metode: 'POST' })
      logg.push(`#${pr.number}: kontrollen kjøres på nytt (${kjoring.html_url}).`)
    } catch (e) {
      feil.push(`#${pr.number}: ${e.message}. Den gamle kontrollen gjelder ikke lenger; start den på nytt eller push til PR-en.`)
    }
  }
  if (prer.length === 0) logg.push(`Ingen åpne PR-er viser til #${sak}.`)
  if (feil.length) throw Object.assign(new Error(feil.join('\n')), { logg })
  return logg
}

// ---------------------------------------------------------------- Kjøring

function oppsummer(tittel, linjer) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${tittel}\n\n${linjer.map((l) => `- ${l}`).join('\n')}\n`)
}

const enLinje = (s) => s.replace(/\r?\n/g, ' ')

async function kjor() {
  const hendelse = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const repo = process.env.GITHUB_REPOSITORY
  const github = lagGithub({ token: process.env.GH_TOKEN })
  if (process.argv[2] === 'sak') {
    const tittel = `Prosjektansvar etter endring i #${hendelse.issue.number}`
    try {
      const logg = await kontrollerSakensPrer(github, repo, hendelse.issue.number)
      for (const l of logg) console.log(l)
      oppsummer(tittel, logg)
    } catch (e) {
      oppsummer(tittel, [...(e.logg ?? []), ...e.message.split('\n')])
      throw e
    }
    return
  }
  const v = await kontrollerPr(github, repo, hendelse.pull_request.number, hendelse.repository.default_branch)
  for (const a of v.advarsler) console.log(`::warning title=Prosjektansvar (overgang)::${enLinje(a)}`)
  for (const f of v.feil) console.log(`::error title=Prosjektansvar mangler eller er feil::${enLinje(f)}`)
  if (v.ok) console.log(v.melding)
  oppsummer('Prosjektansvar', [...(v.ok ? [v.melding] : v.feil), ...v.advarsler])
  if (!v.ok) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  kjor().catch((e) => {
    for (const linje of e.message.split('\n')) console.log(`::error title=Kontrollen «Prosjektansvar» feilet::${linje}`)
    process.exitCode = 1
  })
}
