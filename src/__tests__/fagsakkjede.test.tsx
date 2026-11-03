// @vitest-environment jsdom
/**
 * Hele kjeden fra databasen til redaktørvisningen (VDR-2): en database bygd av
 * migrasjonene, sakene lest med `les_fagsaker` som den innloggede
 * administratoren, og vinduet `Fagsaker` vist med nettopp det svaret. Det
 * prøver at det redaktøren ser og beslutter, er det databasen faktisk har:
 * en tidligere beslutning med tiltak når kilden endres og et nytt spørsmål
 * kommer, og sperrestatusen når nødstoppen er satt for alt, for verktøyet
 * eller ikke i det hele tatt. Alle data er syntetiske.
 */
import type { PGlite } from '@electric-sql/pglite'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Fagsaker } from '../components/konto/Fagsaker'
import type { Databasekall } from '../legemiddeldata/lager'
import { glemBildet } from '../oppdatering/bevaring'
import { agentargumenter, utforAgentoppgave, type Agentoppgave } from '../verktoy/overvaking/agentoppgaver'
import { lagFagsaklager } from '../verktoy/overvaking/fagsak'
import type { Overvakingsfunn, Overvakingsrapport } from '../verktoy/overvaking/modell'
import { registrer } from '../verktoy/overvaking/registrering'
import { lagKildeovervakingslager } from '../verktoy/overvaking/varsling'
import { kallSom } from './hjelp/fest'
import { nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

/** En godkjent regel appen kjenner, så visningen kan vise navnet klinikerne bruker. */
const REGEL = { regelsett: 's', regel: 'seponering-escitalopram', versjon: 11, fingeravtrykk: 'f'.repeat(64), hvorfor: 'henviser til kilden', verktoy: ['trappe-ned-antidepressiv'] }
const REGELNAVN = /Seponering av escitalopram, gjentatt prosentvis nedtrapping \(godkjent versjon 11\)/

const funn = (id: string, avtrykk: string): Overvakingsfunn => ({
  id: `psychiatrienet:${id}`,
  kilde: 'psychiatrienet',
  art: 'endret',
  niva: 'krever_vurdering',
  objekt: id,
  etikett: 'Syntetisk kilde',
  detaljer: ['Nå: syntetisk innhold.'],
  berorte: [REGEL],
  prioritet: 'hoy',
  tilstandsavtrykk: avtrykk.repeat(64),
})

const rapport = (kjort_kl: string, funnene: Overvakingsfunn[]): Overvakingsrapport => ({
  versjon: 1,
  kjort_kl,
  grunnlag: [{ kilde: 'psychiatrienet', kjort: true, kontrollert: 1, beskrivelse: 'Syntetisk' }],
  funn: funnene,
  feil: [],
})

const sporsmal = (over: Record<string, unknown> = {}) => ({
  tittel: 'Kilden for nedtrappingstakten er revidert',
  endring: 'Kilden anbefaler nå en langsommere nedtrapping de siste ukene.',
  kilde: { navn: 'Syntetisk kilde', lenke: 'https://example.invalid/kilde', sammenlignet_kl: '2027-04-01T06:20:00Z' },
  berorte: [{ regel: REGEL.regel, versjon: REGEL.versjon, hva: 'takten de siste ukene' }],
  relevans: 'Planen kan bli for rask for pasienter med seponeringssymptomer.',
  anbefaling: { valg: 'revider', begrunnelse: 'Den reviderte kilden er godt begrunnet og gjelder akkurat denne delen av planen.', av: 'Claude, kontrollert av ChatGPT' },
  valg: [
    { valg: 'behold', verktoyet: 'Planen brukes som før.' },
    { valg: 'revider', verktoyet: 'Planen brukes som før til den nye versjonen er godkjent.' },
    { valg: 'deaktiver', verktoyet: 'Regelen gir ingen plan før den er vurdert på nytt.' },
    { valg: 'utsett', verktoyet: 'Planen brukes som før.' },
  ],
  status_na: 'Planen er fortsatt godkjent og brukes som før.',
  ...over,
})

// PGlite leser sine egne pakker som `Blob`; jsdom sin `Blob` mangler `arrayBuffer`.
Blob.prototype.arrayBuffer ??= function (this: Blob) {
  return new Promise<ArrayBuffer>((ok, feil) => {
    const leser = new FileReader()
    leser.onload = () => ok(leser.result as ArrayBuffer)
    leser.onerror = () => feil(leser.error)
    leser.readAsArrayBuffer(this)
  })
}

beforeEach(() => {
  sessionStorage.clear()
  glemBildet()
})
afterEach(cleanup)

describe('kildesakene fra databasen til redaktørvisningen', () => {
  let db: PGlite
  let admin: string
  let tjener: Databasekall

  /** Et kall som den innloggede `hvem`, som data-API-et gjør det. */
  const kallFor =
    (hvem: string): Databasekall =>
    async (funksjon, argumenter) => {
      const navn = Object.keys(argumenter)
      const rader = await som(db, hvem, async (tx) => (await tx.query<{ r: unknown }>(`select public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`, navn.map((n) => argumenter[n]))).rows)
      return rader[0]!.r
    }
  const lager = () => lagFagsaklager(kallFor(admin))
  const meld = (r: Overvakingsrapport) => registrer(tjener, r, 'cron', 'https://github.com/eier/repo/actions/runs/1')
  const agent = (oppgave: Agentoppgave, felt: Record<string, unknown>) => utforAgentoppgave(tjener, oppgave, agentargumenter(oppgave, { ...felt, av: 'Claude (syntetisk)' })!)
  const sak = async (id: string) => (await lagKildeovervakingslager(kallFor(admin)).les()).funn.find((f) => f.funn === `psychiatrienet:${id}` && f.tilstand !== 'avsluttet')!
  const sperr = (omfang: 'alle' | 'verktoy', mal: string | null) => db.query(`insert into public.verktoysperrer (omfang, mal, grunn, satt_av) values ($1, $2, 'Syntetisk sperre', $3)`, [omfang, mal, admin])
  const opphevAlle = () => db.query(`update public.verktoysperrer set opphevet_kl = now(), opphevet_av = $1, opphevet_grunn = 'Syntetisk opphevet' where opphevet_kl is null`, [admin])
  /** Vinduet slik redaktøren åpner det nå, og kortet for saken med `nr`. */
  const visKortet = async (nr: number) => {
    cleanup()
    render(<Fagsaker apen lager={lager()} onNodstopp={() => {}} />)
    const kortene = await screen.findAllByRole('article')
    const tittel = (await lager().les()).saker.find((x) => x.id === String(nr))!.tittel
    return within(kortene.find((k) => k.textContent!.includes(tittel))!)
  }

  beforeAll(async () => {
    db = await nyDatabase()
    admin = await opprettBruker(db, { brukernavn: 'admin', fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin' })
    tjener = kallSom(db, 'service_role')
  }, 60_000)

  it('sier at kilden er endret igjen, viser den tidligere beslutningen og tiltaket når et nytt spørsmål kommer, og sperrestatusen ved nødstopp for alt', async () => {
    const user = userEvent.setup()
    await meld(rapport('2027-04-01T06:20:00Z', [funn('kjede', '1')]))
    let s = await sak('kjede')
    s = { ...s, versjon: (await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'faglig_relevant', begrunnelse: 'Et relevant avsnitt er endret.' })) as number }
    await agent('faglig_sporsmal', { funn: s.id, versjon: s.versjon, sporsmal: sporsmal() })

    // Redaktøren beslutter i vinduet, mot databasen.
    let kort = await visKortet(s.id)
    expect(kort.getByText(REGELNAVN)).toBeTruthy()
    expect(kort.getByText('Planen er fortsatt godkjent og brukes som før.')).toBeTruthy()
    await user.click(kort.getByRole('radio', { name: /Be om revidert anbefaling/ }))
    await user.click(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    // Beslutningen lukker ikke saken: den følges opp med tiltaket databasen bestilte.
    await waitFor(() => expect(screen.getByText(/Saken avsluttes når alle tiltakene er utført og kontrollert/)).toBeTruthy())
    kort = within(screen.getByRole('article'))
    expect(kort.getByText('Ny regelversjon med uavhengig klinisk godkjenning')).toBeTruthy()
    expect(kort.queryAllByRole('radio')).toHaveLength(0)

    // Kilden endres igjen under oppfølgingen, og den faglige vurderingen gir et nytt spørsmål.
    await meld(rapport('2027-04-08T06:20:00Z', [funn('kjede', '2')]))
    kort = await visKortet(s.id)
    expect(kort.getByText(/Kilden ble endret igjen .*, etter beslutningen\. Endringen vurderes nå/)).toBeTruthy()
    expect(kort.queryByText(/avsluttes ved neste kontroll/)).toBeNull()
    const o = await sak('kjede')
    await agent('faglig_sporsmal', { funn: o.id, versjon: o.versjon, sporsmal: sporsmal({ endring: 'Kilden anbefaler nå også lengre tid mellom de to siste trinnene.' }) })

    kort = await visKortet(s.id)
    expect(kort.getByText(/lengre tid mellom de to siste trinnene/)).toBeTruthy()
    const tidligere = within(kort.getByText('Tidligere i saken').parentElement!)
    expect(tidligere.getByText(/Besluttet .* av Ada Admin/)).toBeTruthy()
    expect(tidligere.getByText(/Be om revidert anbefaling/)).toBeTruthy()
    expect(tidligere.getByText('Ny regelversjon med uavhengig klinisk godkjenning')).toBeTruthy()
    expect(kort.getAllByRole('radio')).toHaveLength(4)
    expect(kort.queryByText('Sperret med nødstoppen')).toBeNull()

    // Nødstopp for alle verktøyene: databasen sier at regelen er sperret, og vinduet viser det.
    await sperr('alle', null)
    kort = await visKortet(s.id)
    expect(kort.getByText('Sperret med nødstoppen')).toBeTruthy()
    expect(kort.getByText('Den berørte regelen er sperret med nødstoppen og gir ingen plan.')).toBeTruthy()
    await opphevAlle()
  })

  it('lover ikke at noe virker som før for et sikkerhetsproblem under vurdering når verktøyet er stoppet', async () => {
    await meld(rapport('2027-04-15T06:20:00Z', [funn('risiko', '3')]))
    const s = await sak('risiko')
    await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'mulig_alvorlig_risiko', begrunnelse: 'Kilden fraråder nå planen for en vanlig pasientgruppe.' })

    // Ingen sperre: databasen sier at verktøyet virker som før, og vinduet foreslår nødstoppen.
    let kort = await visKortet(s.id)
    expect(kort.getByText('Sikkerhetsproblem under vurdering')).toBeTruthy()
    expect(kort.getByText(/kan du deaktivere den berørte regelen med nødstoppen/)).toBeTruthy()

    // Nødstopp for verktøyet regelen hører til: sperret, uten løfter om andre anbefalinger.
    await sperr('verktoy', 'trappe-ned-antidepressiv')
    kort = await visKortet(s.id)
    expect(kort.getByText('Sperret med nødstoppen')).toBeTruthy()
    expect(kort.getByText('Den berørte regelen er sperret med nødstoppen og gir ingen plan.')).toBeTruthy()
    expect(kort.queryByText(/virker som før/)).toBeNull()
    expect(kort.queryByText(/kan du deaktivere/)).toBeNull()
    await opphevAlle()
  })
})
