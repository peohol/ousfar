/*
 * D0-prototypen: klikkbar skisse av dashboard, grupper, chat og navigasjon.
 * Bare en designskisse med eksempeldata. Ingen kode herfra skal kopieres inn i
 * appen; atferden skal bygges med appens egne komponenter (se ../README.md).
 *
 * Skissen viser særlig tre ting som er vanskelige å se på stillbilder:
 * - Escape-kontrakten: linjen nederst sier alltid hva neste Escape gjør.
 * - Inngangsveien: «Tilbake»-lenkene sier hvor de går, og faller tilbake til
 *   forsiden når siden ble åpnet direkte.
 * - Lagene: hovedmenyen parkerer chatmenyen, og chat og diskusjoner står bare
 *   åpne samtidig når siden fortsatt har lesebredde.
 *
 * Adressen kan styres for skjermbilder: ?skjerm=<id>&tema=moerkt&ren
 * Med `window.D0_MINNE` holdes adressen i minnet i stedet for i nettleseren
 * (for visning der adresselinjen ikke kan brukes).
 */
'use strict'

/* ---------------------------------------------------------------------------
 * Hjelpere
 * ------------------------------------------------------------------------- */
const ikon = (navn, etikett) => {
  const svg = window.IKONER[navn] || window.IKONER.more
  return etikett ? svg.replace('aria-hidden="true"', `role="img" aria-label="${etikett}"`) : svg
}
const smal = () => window.matchMedia('(max-width: 47.5em)').matches
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
const initialer = (navn) =>
  navn
    .split(' ')
    .map((d) => d[0])
    .join('')
    .slice(0, 2)

/* ---------------------------------------------------------------------------
 * Eksempeldata (fiktive navn og hendelser)
 * ------------------------------------------------------------------------- */
const FAGMILJOER = [
  { id: 'ous', navn: 'OUS Klinisk farmakologi', merknad: 'Ditt fagmiljø' },
  { id: 'sandkasse', navn: 'Sandkasse', merknad: 'Testmiljø' },
  { id: 'b', navn: 'Fagmiljø B', merknad: 'Ikke medlem', ikkeMedlem: true },
]

const GRUPPER = [
  {
    id: 'sandkasse',
    navn: 'Sandkassegruppen',
    beskrivelse: 'Et sted å prøve ut nye arbeidsmåter før de tas i bruk.',
    hvor: 'På tvers av fagmiljøer',
    medlemmer: ['Peder Holm', 'Kari Nordmann', 'Ola Nordmann', 'Anne Berg', 'Jon Dahl', 'Lise Moen', 'Per Lunde', 'Siri Strand'],
    rolle: 'Ansvarlig',
    nytt: 3,
  },
  {
    id: 'faglig',
    navn: 'Faglig utvikling',
    beskrivelse: 'Kurs, journalklubb og faglige prioriteringer.',
    hvor: 'OUS Klinisk farmakologi',
    medlemmer: ['Peder Holm', 'Anne Berg', 'Jon Dahl', 'Lise Moen', 'Per Lunde'],
    rolle: 'Medlem',
    nytt: 0,
  },
  {
    id: 'tverrfaglig',
    navn: 'Tverrfaglig samarbeid',
    beskrivelse: 'Samarbeid med apotek og klinikk.',
    hvor: 'På tvers av fagmiljøer',
    medlemmer: ['Peder Holm', 'Kari Nordmann', 'Siri Strand', 'Per Lunde'],
    rolle: 'Moderator',
    nytt: 1,
  },
  {
    id: 'gammel',
    navn: 'Metodevalidering 2025',
    beskrivelse: 'Avsluttet prosjekt.',
    hvor: 'OUS Klinisk farmakologi',
    medlemmer: ['Peder Holm', 'Jon Dahl', 'Anne Berg'],
    rolle: 'Medlem',
    nytt: 0,
    arkivert: true,
  },
]
const gruppe = (id) => GRUPPER.find((g) => g.id === id)

const SAMTALER = [
  { id: 'sandkasse', type: 'gruppe', navn: 'Sandkassegruppen', uleste: 2, tid: '14.02' },
  { id: 'ola', type: 'direkte', navn: 'Ola Nordmann', bruker: 'olanor', aktiv: true, uleste: 1, tid: '13.40' },
  { id: 'faglig', type: 'gruppe', navn: 'Faglig utvikling', uleste: 0, tid: 'I går' },
  { id: 'tverrfaglig', type: 'gruppe', navn: 'Tverrfaglig samarbeid', uleste: 0, tid: 'Man.' },
  { id: 'kari', type: 'direkte', navn: 'Kari Nordmann', bruker: 'karnor', uleste: 0, tid: '12.11', sperret: true },
]
const samtale = (id) => SAMTALER.find((s) => s.id === id)
const samtaleadresse = (s) => `#/chat/${s.type === 'gruppe' ? 'gruppe' : 'direkte'}/${s.id}`

const MELDINGER = {
  sandkasse: [
    { dato: 'I går' },
    { fra: 'Anne Berg', tekst: 'Jeg har lagt inn utkastet til den nye rutinen som en oppgave.', tid: '15.10' },
    { fra: 'Peder Holm', egen: true, tekst: 'Takk! Jeg ser på den i morgen.', tid: '15.22' },
    { dato: 'I dag' },
    { fra: 'Ola Nordmann', tekst: 'Oppgaven er oppdatert med kommentarene fra møtet.', tid: '13.58' },
    { fra: 'Ola Nordmann', tekst: 'Si fra om noe mangler før fredag.', tid: '14.02' },
  ],
  ola: [
    { dato: 'I dag' },
    { fra: 'Ola Nordmann', tekst: 'Har du tid til en kort prat om idéen med enheter i kommentaren?', tid: '13.40' },
  ],
  faglig: [
    { dato: 'I går' },
    { fra: 'Jon Dahl', tekst: 'Journalklubben flyttes til torsdag.', tid: '09.12' },
  ],
  tverrfaglig: [
    { dato: 'Mandag' },
    { fra: 'Siri Strand', tekst: 'Neste møte blir på Teams.', tid: '10.05' },
  ],
  kari: [
    { dato: '12. november' },
    { fra: 'Kari Nordmann', tekst: 'Takk for innspillet på fagsiden!', tid: '11.20' },
    { fra: 'Peder Holm', egen: true, tekst: 'Bare hyggelig.', tid: '11.31' },
  ],
}

const IDEER = [
  { id: 'i1', tittel: 'Felles mal for møtereferat', status: 'Åpen', meta: 'Anne Berg · 3 kommentarer', nytt: true },
  { id: 'i2', tittel: 'Vis enhet i kopiert kommentar', status: 'Under vurdering', meta: 'Ola Nordmann · 5 kommentarer', nytt: true },
  { id: 'i3', tittel: 'Ukentlig oppsummering i gruppen', status: 'Åpen', meta: 'Lise Moen · 1 kommentar' },
  { id: 'i4', tittel: 'Bedre navn på testmiljøene', status: 'Utført', meta: 'Jon Dahl · 2 kommentarer' },
]
const OPPGAVER = [
  { id: 'o1', tittel: 'Oppdatere rutine for nye analytter', status: 'Pågår', meta: 'Tildelt deg · frist 22.11', deg: true },
  { id: 'o2', tittel: 'Samle innspill til journalklubben', status: 'Pågår', meta: 'Anne Berg · frist 30.11' },
  { id: 'o3', tittel: 'Rydde i gamle testgrupper', status: 'Ikke startet', meta: 'Ingen tildelt' },
]

const MODULER = [
  { id: 'viktig', navn: 'Viktig nytt', paa: true },
  { id: 'aktuelt', navn: 'Aktuelt for deg', paa: true },
  { id: 'grupper', navn: 'Mine grupper', paa: true },
  { id: 'fagsider', navn: 'Oppdaterte fagsider', paa: true },
  { id: 'ideer', navn: 'Nytt i idébanken', paa: false },
  { id: 'oppgaver', navn: 'Mine oppgaver', paa: false },
  { id: 'diskusjoner', navn: 'Diskusjoner jeg følger', paa: false },
  { id: 'favoritter', navn: 'Favorittfagsider', paa: false },
  { id: 'nylig', navn: 'Nylig besøkt', paa: false },
]

/* Innholdet i modulene: maks tre hendelser, hver med hva, hvor og lenke til selve hendelsen. */
const MODULINNHOLD = {
  viktig: {
    ikon: 'bell',
    alle: 'Alle varsler',
    hendelser: [
      { ikon: 'publish', tittel: 'Gruppechat er tilgjengelig i alle grupper', hvor: 'Appen · Ny funksjon', tid: '17.11', til: '#/' },
      { ikon: 'refs', tittel: 'Fagsidene viser bivirkninger etter organsystem', hvor: 'Fagsidene · Ny visning', tid: '14.11', til: '#/stoff/kvetiapin' },
      { ikon: 'shield', tittel: 'Pasientopplysninger skal ikke legges inn noe sted', hvor: 'Appen · Regel for alle', tid: '17.11', til: '#/' },
    ],
  },
  aktuelt: {
    ikon: 'done',
    alle: 'Vis alle',
    hendelser: [
      { ikon: 'foresla', tittel: 'Endringsforslag venter på deg: Kvetiapin, dosering', hvor: 'Endringsforslag · Til behandling', tid: '10.32', til: '#/forslag/til-behandling', ulest: true },
      { ikon: 'oppgaver', tittel: 'Du er tildelt «Oppdatere rutine for nye analytter»', hvor: 'Sandkassegruppen · Oppgave', tid: 'I går', til: '#/grupper/sandkasse/oppgaver/o1', ulest: true },
      { ikon: 'comment', tittel: 'Ny kommentar på idéen «Vis enhet i kopiert kommentar»', hvor: 'Sandkassegruppen · Idé', tid: 'I går', til: '#/grupper/sandkasse/ideer/i2' },
    ],
  },
  fagsider: {
    ikon: 'stoffregister',
    alle: 'Vis flere',
    hendelser: [
      { ikon: 'dose', tittel: 'Kvetiapin', hvor: 'Dosering er oppdatert', tid: '17.11', til: '#/stoff/kvetiapin/dosering' },
      { ikon: 'inter', tittel: 'Litium', hvor: 'Ny referanse under Interaksjoner', tid: '16.11', til: '#/stoff/litium/interaksjoner' },
      { ikon: 'pk', tittel: 'Sertralin', hvor: 'Farmakokinetikk er revidert', tid: '12.11', til: '#/stoff/sertralin/farmakokinetikk' },
    ],
  },
  ideer: {
    ikon: 'idea',
    alle: 'Alle idéer',
    hendelser: [
      { ikon: 'idea', tittel: 'Felles mal for møtereferat', hvor: 'Sandkassegruppen', tid: 'I dag', til: '#/grupper/sandkasse/ideer/i1' },
      { ikon: 'idea', tittel: 'Hurtigtast for å bytte fagmiljø', hvor: 'Appen', tid: '15.11', til: '#/ide/a7' },
    ],
  },
  oppgaver: {
    ikon: 'oppgaver',
    alle: 'Alle oppgaver',
    hendelser: [{ ikon: 'oppgaver', tittel: 'Oppdatere rutine for nye analytter', hvor: 'Sandkassegruppen · frist 22.11', tid: 'Pågår', til: '#/grupper/sandkasse/oppgaver/o1' }],
  },
  diskusjoner: {
    ikon: 'diskusjon',
    alle: 'Vis alle',
    hendelser: [{ ikon: 'reply', tittel: 'Nytt svar i «Dosering ved nedsatt nyrefunksjon»', hvor: 'Kvetiapin · Diskusjon', tid: 'I går', til: '#/diskusjon/d3/k9' }],
  },
  favoritter: {
    ikon: 'star',
    alle: 'Alle favoritter',
    hendelser: [
      { ikon: 'star', tittel: 'Kvetiapin', hvor: 'Endret 17.11', tid: '', til: '#/stoff/kvetiapin' },
      { ikon: 'star', tittel: 'Klozapin', hvor: 'Ingen nye endringer', tid: '', til: '#/stoff/klozapin' },
    ],
  },
  nylig: {
    ikon: 'history',
    alle: '',
    hendelser: [
      { ikon: 'stoffregister', tittel: 'Kvetiapin', hvor: 'Fagside', tid: '', til: '#/stoff/kvetiapin' },
      { ikon: 'sandkasse', tittel: 'Sandkassegruppen', hvor: 'Gruppe', tid: '', til: '#/grupper/sandkasse' },
    ],
  },
}

/* ---------------------------------------------------------------------------
 * Tilstand
 * ------------------------------------------------------------------------- */
const STANDARD = () => ({
  chat: 'boble', // boble | apen
  chatVisning: 'oversikt', // oversikt | ny | <samtale-id>
  chatbredde: null, // rem, satt med kanthåndtaket
  gruppeskuff: true,
  chatParkert: false,
  dm: false, // Tillat direktemeldinger: av som standard (planen §6.2)
  aktivstatus: false,
  hovedmeny: false,
  popover: null, // fagmiljo | konto
  modal: null, // tilpass | medlemmer | nygruppe | innstillinger | gruppeinnstillinger
  diskusjoner: 'boble', // boble | apen
  moduler: MODULER.map((m) => ({ ...m })),
  tom: false,
  fagmiljo: 'ous',
  fra: [], // intern inngangsvei: adressene brukeren kom fra
})
let S = STANDARD()

/* ---------------------------------------------------------------------------
 * Ruter (samme adresser som planen §2)
 * ------------------------------------------------------------------------- */
const MINNE = Boolean(window.D0_MINNE)
let minneadresse = '#/'
const adressen = () => (MINNE ? minneadresse : location.hash)

function lesRute(hash = adressen()) {
  const h = hash.replace(/^#/, '') || '/'
  let m
  if (h === '/' || h === '') return { side: 'forside' }
  if (h === '/fortolkning') return { side: 'fortolkning' }
  if ((m = h.match(/^\/fortolkning\/([a-z]+)$/))) return { side: 'analytt', analytt: m[1] }
  if ((m = h.match(/^\/stoff\/([a-z]+)(?:\/([a-z]+))?$/))) return { side: 'fagside', stoff: m[1], seksjon: m[2] }
  if (h === '/grupper') return { side: 'grupper' }
  if ((m = h.match(/^\/grupper\/([a-z]+)(?:\/(ideer|oppgaver|chat)(?:\/([a-z0-9]+))?)?$/)) && gruppe(m[1]))
    return { side: 'gruppe', gruppe: m[1], flate: m[2], mal: m[3] }
  if (h === '/chat') return { side: 'chat' }
  if ((m = h.match(/^\/chat\/(gruppe|direkte)\/([a-z]+)$/)) && samtale(m[2])) return { side: 'chat', samtale: m[2] }
  if (h.startsWith('/forslag')) return { side: 'forslag' }
  return { side: 'ukjent' }
}

function sidetittel(hash) {
  const r = lesRute(hash)
  return (
    {
      forside: 'forsiden',
      fortolkning: 'fortolkningen',
      analytt: 'fortolkningen',
      fagside: r.stoff ? r.stoff[0].toUpperCase() + r.stoff.slice(1) : 'fagsiden',
      grupper: 'Grupper',
      gruppe: gruppe(r.gruppe)?.navn,
      chat: 'chatten',
      forslag: 'Endringsforslag',
    }[r.side] || 'forsiden'
  )
}

/** Går til en adresse og husker hvor brukeren kom fra (inngangsveien). */
function gaa(hash, { erstatt = false } = {}) {
  if (hash === adressen()) return render()
  if (!erstatt) S.fra.push(adressen() || '#/')
  if (MINNE) minneadresse = hash
  else history[erstatt ? 'replaceState' : 'pushState']({ dybde: S.fra.length }, '', hash)
  etterNavigering()
}

/** Tilbake etter inngangsveien; forsiden når siden ble åpnet direkte. */
function tilbakeMaal() {
  return S.fra.length ? S.fra[S.fra.length - 1] : '#/'
}
function tilbake() {
  if (!MINNE && S.fra.length > (S.virtuell || 0)) return history.back()
  if (S.fra.length) {
    const maal = S.fra.pop()
    S.virtuell = Math.min(S.virtuell || 0, S.fra.length)
    if (MINNE) minneadresse = maal
    else history.replaceState({ dybde: S.fra.length }, '', maal)
    return etterNavigering()
  }
  gaa('#/', { erstatt: true })
}

window.addEventListener('popstate', (e) => {
  const dybde = e.state?.dybde ?? 0
  while (S.fra.length > dybde) S.fra.pop()
  etterNavigering()
})

function etterNavigering({ beholdLag = false } = {}) {
  const r = lesRute()
  // Gammel adresse til gruppechatten: åpner gruppen med chatten i chatmenyen.
  if (r.side === 'gruppe' && r.flate === 'chat') {
    S.chat = 'apen'
    S.chatVisning = r.gruppe
    if (MINNE) minneadresse = `#/grupper/${r.gruppe}`
    else history.replaceState(history.state, '', `#/grupper/${r.gruppe}`)
  }
  if (r.side === 'chat' && r.samtale) S.chatVisning = r.samtale
  if (!beholdLag) {
    S.popover = null
    // Et valg i hovedmenyen lukker den; chatmenyen kommer tilbake.
    S.hovedmeny = false
    S.chatParkert = false
  }
  render()
  // Etter «Gjenopprett» står fokus i chatmenyen igjen; ellers i sidens overskrift.
  const fokus = S.fokusChat ? '.chatmeny [data-autofokus], .chatmeny button' : 'main h1, main [data-autofokus]'
  S.fokusChat = false
  document.querySelector(fokus)?.focus({ preventScroll: true })
  window.scrollTo(0, 0)
}

/* ---------------------------------------------------------------------------
 * Lagene og Escape (planen §3 og §5.2)
 *
 * Én funksjon bestemmer hva Escape gjør, ut fra det øverste laget. Den samme
 * funksjonen gir teksten i prototypelinjen, så det som vises er det som skjer.
 * ------------------------------------------------------------------------- */
function escapeHandling() {
  const r = lesRute()
  const fokusIChat = document.activeElement?.closest('.chatmeny')
  const fokusIDiskusjoner = document.activeElement?.closest('.diskusjonsmeny')
  if (S.modal) return { tekst: 'Lukker vinduet (bare det øverste laget)', utfor: lukkModal }
  if (erArbeidsflate(r))
    return { tekst: `Lukker arbeidsflaten og går tilbake til ${sidetittel(arbeidsflateMaal(r))}`, utfor: lukkModal }
  if (S.popover) return { tekst: 'Lukker nedtrekket, fokus til knappen', utfor: lukkPopover }
  if (S.hovedmeny) return { tekst: 'Lukker hovedmenyen og henter chatmenyen tilbake', utfor: lukkHovedmeny }
  if (r.side === 'chat' && !smal())
    return { tekst: `Gjenoppretter chatmenyen på ${sidetittel(tilbakeMaal())}`, utfor: gjenopprettChat }
  if (S.chat === 'apen' && (fokusIChat || smal())) {
    if (smal()) return { tekst: 'Lukker chatten (samtalen og utkastet huskes)', utfor: lukkChat }
    return { tekst: 'Slipper chatmenyen: fokus tilbake til siden, menyen blir stående', utfor: slippChat }
  }
  if (fokusIDiskusjoner)
    return { tekst: 'Slipper diskusjonsmenyen (som i dag)', utfor: () => document.querySelector('main h1')?.focus() }
  if (r.side === 'analytt')
    return {
      tekst: 'Ett trinn tilbake i fortolkningen',
      // Et steg tilbake, ikke en ny oppføring i nettleserhistorikken.
      utfor: () => (tilbakeMaal() === '#/fortolkning' ? tilbake() : gaa('#/fortolkning', { erstatt: true })),
    }
  if (r.side === 'fortolkning') return { tekst: 'Ingenting: fortolkningssøket er siste stopp', utfor: () => {} }
  if (r.side === 'forside') return { tekst: 'Ingenting på forsiden', utfor: () => {} }
  return { tekst: `Lukker siden og går tilbake til ${sidetittel(tilbakeMaal())}`, utfor: tilbake }
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  e.preventDefault()
  escapeHandling().utfor()
})
document.addEventListener('focusin', oppdaterEscapelinje)

function oppdaterEscapelinje() {
  const el = document.getElementById('escape-nå')
  if (el) el.textContent = escapeHandling().tekst
}

/* ---------------------------------------------------------------------------
 * Handlinger
 * ------------------------------------------------------------------------- */
function plassTilBegge(chatRem = S.chatbredde || 24) {
  const ledig = window.innerWidth / rem() - chatRem - 26 - 4 * 0.875 - 2 * 2.5
  return ledig >= 45
}

function apneChat(visning) {
  S.chat = 'apen'
  if (visning) S.chatVisning = visning
  S.chatParkert = false
  // Chat og diskusjoner deler bredden bare når siden fortsatt kan leses.
  if (S.diskusjoner === 'apen' && !plassTilBegge()) S.diskusjoner = 'boble'
  render()
  document.querySelector('.chatmeny [data-autofokus]')?.focus()
}
function lukkChat() {
  S.chat = 'boble'
  render()
  document.querySelector('.chatboble, [data-handling="chat"]')?.focus()
}
function slippChat() {
  document.querySelector('main h1, main [data-autofokus]')?.focus()
  oppdaterEscapelinje()
}
function apneDiskusjoner() {
  S.diskusjoner = 'apen'
  if (S.chat === 'apen' && !plassTilBegge()) S.chat = 'boble'
  render()
}
function apneHovedmeny() {
  // Hovedmenyen har forrang: chatmenyen parkeres og kommer tilbake etterpå.
  S.chatParkert = S.chat === 'apen'
  S.hovedmeny = true
  render()
  document.querySelector('.hovedmeny [data-autofokus]')?.focus()
}
function lukkHovedmeny() {
  S.hovedmeny = false
  S.chatParkert = false
  render()
  document.querySelector('[data-handling="hovedmeny"]')?.focus()
}
function utvidChat() {
  const s = samtale(S.chatVisning)
  gaa(s ? samtaleadresse(s) : '#/chat')
}
function gjenopprettChat() {
  S.chat = 'apen'
  S.fokusChat = true
  if (S.fra.length) tilbake()
  else gaa('#/', { erstatt: true })
}
/*
 * Arbeidsflaten (idéer eller oppgaver i en gruppe) har egen adresse og lukkes
 * etter inngangsveien som en side: tilbake dit den ble åpnet fra (forsiden,
 * varselet, gruppesiden, chatten). Valg i lista inne i flaten erstatter adressen,
 * så lukking og nettleserens Tilbake går ut av flaten i ett steg. Åpnet fra en
 * lenke utenfra er gruppesiden reserven, ikke forsiden.
 */
function erArbeidsflate(r) {
  return r.side === 'gruppe' && (r.flate === 'ideer' || r.flate === 'oppgaver')
}
function iSammeArbeidsflate(hash) {
  const fra = lesRute()
  const til = lesRute(hash)
  return erArbeidsflate(fra) && erArbeidsflate(til) && fra.gruppe === til.gruppe && fra.flate === til.flate
}
function arbeidsflateMaal(r) {
  return S.fra.length ? tilbakeMaal() : `#/grupper/${r.gruppe}`
}
function bakgrunnForArbeidsflate(r) {
  const under = lesRute(arbeidsflateMaal(r))
  return erArbeidsflate(under) ? lesRute(`#/grupper/${r.gruppe}`) : under
}
function lukkModal() {
  const r = lesRute()
  if (!S.modal && erArbeidsflate(r)) {
    if (S.fra.length) tilbake()
    else gaa(arbeidsflateMaal(r), { erstatt: true })
    return
  }
  const fra = S.modalFra
  S.modal = null
  render()
  document.querySelector(`[data-modalfra="${fra}"]`)?.focus()
}

function lukkPopover() {
  const fra = S.popover
  S.popover = null
  render()
  document.querySelector(`[data-handling="popover"][data-arg="${fra}"]`)?.focus()
}

const HANDLINGER = {
  hovedmeny: () => (S.hovedmeny ? lukkHovedmeny() : apneHovedmeny()),
  'lukk-hovedmeny': lukkHovedmeny,
  chat: () => (S.chat === 'apen' && !smal() ? lukkChat() : apneChat()),
  'lukk-chat': lukkChat,
  'utvid-chat': utvidChat,
  'gjenopprett-chat': gjenopprettChat,
  'chat-visning': (arg) => {
    S.chatVisning = arg
    if (lesRute().side === 'chat') {
      const s = samtale(arg)
      return gaa(s ? samtaleadresse(s) : '#/chat', { erstatt: true })
    }
    render()
    document.querySelector('.chatmeny [data-autofokus]')?.focus()
  },
  gruppeskuff: () => ((S.gruppeskuff = !S.gruppeskuff), render()),
  dm: () => ((S.dm = !S.dm), render()),
  aktivstatus: () => ((S.aktivstatus = !S.aktivstatus), render()),
  diskusjoner: () => (S.diskusjoner === 'apen' ? ((S.diskusjoner = 'boble'), render()) : apneDiskusjoner()),
  popover: (arg) => {
    if (S.popover === arg) return lukkPopover()
    S.popover = arg
    render()
    document.querySelector('.popover button.valg:not([style]), .popover button')?.focus()
  },
  fagmiljo: (arg) => {
    S.fagmiljo = arg
    lukkPopover()
  },
  modal: (arg, el) => {
    S.modal = arg
    S.modalFra = el?.dataset.modalfra
    S.popover = null
    render()
    document.querySelector('.modal [data-autofokus]')?.focus()
  },
  'lukk-modal': lukkModal,
  tilbake,
  modul: (arg) => {
    const m = S.moduler.find((x) => x.id === arg)
    m.paa = !m.paa
    render()
  },
  flytt: (arg) => {
    const [id, retning] = arg.split(':')
    const i = S.moduler.findIndex((x) => x.id === id)
    const j = i + Number(retning)
    if (j < 0 || j >= S.moduler.length) return
    ;[S.moduler[i], S.moduler[j]] = [S.moduler[j], S.moduler[i]]
    render()
    document.querySelector(`[data-handling="flytt"][data-arg="${arg}"]`)?.focus()
  },
  standard: () => ((S.moduler = MODULER.map((m) => ({ ...m }))), render()),
  skjerm: (arg) => velgSkjerm(arg),
  tema: () => {
    const el = document.documentElement
    el.dataset.tema = el.dataset.tema === 'moerkt' ? 'lyst' : 'moerkt'
    render()
  },
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-handling]')
  if (el) {
    e.preventDefault()
    return HANDLINGER[el.dataset.handling]?.(el.dataset.arg, el)
  }
  const a = e.target.closest('a[href^="#/"]')
  if (a) {
    e.preventDefault()
    const hash = a.getAttribute('href')
    gaa(hash, { erstatt: iSammeArbeidsflate(hash) })
  }
  if (e.target.classList.contains('slor')) lukkModal()
  if (e.target.classList.contains('hovedmeny-slor')) lukkHovedmeny()
})
document.addEventListener('change', (e) => {
  if (e.target.id === 'skjermvalg') velgSkjerm(e.target.value)
})

/* Kanthåndtaket: dra med pekeren, eller piltaster når det har fokus. */
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.kanthandtak')
  if (!h) return
  h.setPointerCapture(e.pointerId)
  const flytt = (ev) => settChatbredde((ev.clientX - h.parentElement.getBoundingClientRect().left) / rem())
  h.addEventListener('pointermove', flytt)
  h.addEventListener('pointerup', () => h.removeEventListener('pointermove', flytt), { once: true })
})
document.addEventListener('keydown', (e) => {
  if (!e.target.classList?.contains('kanthandtak')) return
  const steg = { ArrowRight: 2, ArrowLeft: -2 }[e.key]
  if (!steg) return
  e.preventDefault()
  settChatbredde((S.chatbredde || 24) + steg)
  document.querySelector('.kanthandtak')?.focus()
})
function settChatbredde(r) {
  const mest = Math.min(40, window.innerWidth / rem() - 45)
  S.chatbredde = Math.round(Math.max(20, Math.min(mest, r)) * 4) / 4
  render()
}

/* ---------------------------------------------------------------------------
 * Byggeklosser
 * ------------------------------------------------------------------------- */
const knapp = (tekst, handling, { variant, ikonnavn, arg, storrelse, modalfra, etikett } = {}) =>
  `<button type="button" class="pilleknapp" data-handling="${handling}"${arg ? ` data-arg="${arg}"` : ''}${
    variant ? ` data-variant="${variant}"` : ''
  }${storrelse ? ` data-storrelse="${storrelse}"` : ''}${modalfra ? ` data-modalfra="${modalfra}"` : ''}${
    etikett ? ` aria-label="${etikett}"` : ''
  }>${ikonnavn ? ikon(ikonnavn) : ''}${tekst}</button>`

const ikonknapp = (navn, etikett, handling, { variant, arg, teller, stille, ekstra = '' } = {}) =>
  `<button type="button" class="ikonknapp" data-handling="${handling}"${arg ? ` data-arg="${arg}"` : ''}${
    variant ? ` data-variant="${variant}"` : ''
  } aria-label="${etikett}${teller ? `, ${teller} uleste` : ''}" title="${etikett}" ${ekstra}>${ikon(navn)}${
    teller ? `<span class="teller"${stille ? ' data-stille' : ''} aria-hidden="true">${teller}</span>` : ''
  }</button>`

const tilbakelenke = () => {
  const maal = tilbakeMaal()
  return `<a class="lenke tilbake" href="${maal}" data-handling="tilbake">${ikon('back')}Tilbake til ${sidetittel(maal)}</a>`
}

function panel(id, { tittel, ikonnavn, innhold, fot }) {
  return `<section class="panel" aria-labelledby="p-${id}">
    <div class="panel__hode">${ikon(ikonnavn)}<h2 class="panel__tittel" id="p-${id}">${tittel}</h2></div>
    ${innhold}
    ${fot ? `<div class="panel__fot">${fot}</div>` : ''}
  </section>`
}

function hendelser(liste) {
  if (!liste.length) return '<p class="tom">Ingen nye hendelser.</p>'
  return `<ul class="hendelser">${liste
    .slice(0, 3)
    .map(
      (h) => `<li><a class="hendelse" href="${h.til}">${ikon(h.ikon)}
      <span class="hendelse__tittel">${h.ulest ? '<span class="ulestprikk" aria-hidden="true"></span><span class="skjult">Ulest: </span>' : ''}${h.tittel}</span>
      <span class="hendelse__hvor">${h.hvor}</span>
      ${h.tid ? `<span class="hendelse__tid">${h.tid}</span>` : ''}</a></li>`,
    )
    .join('')}</ul>`
}

const bryter = (id, tittel, forklaring, paa, handling) =>
  `<label class="bryter" for="${id}"><input id="${id}" type="checkbox" role="switch" ${paa ? 'checked' : ''} data-handling="${handling}" />
  <span class="bryter__spor" aria-hidden="true"></span>
  <span class="bryter__tekst">${tittel}${forklaring ? `<small>${forklaring}</small>` : ''}</span>
  <span class="bryter__status" aria-hidden="true">${paa ? 'På' : 'Av'}</span></label>`

/* ---------------------------------------------------------------------------
 * Toppmenyen
 * ------------------------------------------------------------------------- */
function toppmeny(r) {
  const uleste = SAMTALER.reduce((n, s) => n + s.uleste, 0)
  const infoside = !['forside', 'fortolkning', 'analytt'].includes(r.side)
  return `<header class="toppmeny"><nav class="toppmeny__pille" aria-label="Toppmeny">
    ${ikonknapp('menu', 'Hovedmeny (Ctrl+M)', 'hovedmeny', { ekstra: `aria-expanded="${S.hovedmeny}"` })}
    <div class="fagsok" role="search">${ikon('search')}<span>Søk i fagstoff</span><kbd>Ctrl K</kbd></div>
    ${
      r.side === 'fagside'
        ? `<span class="kunmobil">${ikonknapp('diskusjon', 'Diskusjoner', 'diskusjoner')}</span>`
        : ''
    }
    ${infoside ? ikonknapp('close', `Lukk og gå tilbake til ${sidetittel(tilbakeMaal())}`, 'tilbake') : ''}
    <span class="toppmeny__skille" aria-hidden="true"></span>
    <span class="kunmobil">${ikonknapp('samtale', 'Chat', 'chat', { teller: uleste, stille: true })}</span>
    ${ikonknapp('bell', 'Varsler', 'popover', { arg: 'varsler', teller: 2 })}
    <span class="fagmiljo">${ikonknapp('user', 'Konto', 'popover', { arg: 'konto', variant: 'aksent', ekstra: `aria-expanded="${S.popover === 'konto'}"` })}
    ${S.popover === 'konto' ? kontomeny() : ''}</span>
  </nav></header>`
}

function kontomeny() {
  return `<div class="popover" style="left:auto;right:0" role="menu" aria-label="Konto">
    <div class="valg" style="pointer-events:none"><span class="avatar" data-stor>PH</span><span class="valg__tekst"><strong>Peder Holm</strong><small>pedhol · Systemarkitekt</small></span></div>
    <hr class="skillelinje" />
    <button class="valg" role="menuitem">${ikon('edit')}<span class="valg__tekst">Endre navn og profilbilde</span></button>
    <button class="valg" role="menuitem">${ikon('laboratorium')}<span class="valg__tekst">Fagmiljø<small>OUS Klinisk farmakologi</small></span></button>
    <button class="valg" role="menuitem">${ikon('foresla')}<span class="valg__tekst">Mine forslag</span></button>
    <button class="valg" role="menuitem">${ikon('done')}<span class="valg__tekst">Til behandling</span><span class="merke">3</span></button>
    <button class="valg" role="menuitem">${ikon('shield')}<span class="valg__tekst">Mitt redaktøransvar</span></button>
    <button class="valg" role="menuitem" data-handling="modal" data-arg="innstillinger" data-modalfra="konto">${ikon('gears')}<span class="valg__tekst">Innstillinger<small>Visning og chat</small></span></button>
    <hr class="skillelinje" />
    <button class="valg" role="menuitem">${ikon('logout')}<span class="valg__tekst">Logg ut</span></button>
  </div>`
}

/* ---------------------------------------------------------------------------
 * Sidene
 * ------------------------------------------------------------------------- */
function forside() {
  const fm = FAGMILJOER.find((f) => f.id === S.fagmiljo)
  const flere = FAGMILJOER.length > 1
  const moduler = S.moduler.filter((m) => m.paa)
  const kort = moduler.map((m) => {
    if (m.id === 'grupper') {
      const mine = S.tom ? [] : GRUPPER.filter((g) => !g.arkivert)
      return panel(m.id, {
        tittel: m.navn,
        ikonnavn: 'sandkasse',
        innhold: mine.length
          ? hendelser(
              mine.map((g) => ({
                ikon: 'sandkasse',
                tittel: g.navn,
                hvor: `${g.hvor} · ${g.medlemmer.length} medlemmer`,
                tid: g.nytt ? `${g.nytt} nye` : '',
                til: `#/grupper/${g.id}`,
              })),
            )
          : '<p class="tom">Du er ikke med i noen grupper ennå.</p>',
        fot: `<a class="lenke" href="#/grupper">Alle grupper ${ikon('chev')}</a>`,
      })
    }
    const inn = MODULINNHOLD[m.id]
    const liste = S.tom && m.id !== 'viktig' ? [] : inn.hendelser
    return panel(m.id, {
      tittel: m.navn,
      ikonnavn: inn.ikon,
      innhold: hendelser(liste),
      fot: inn.alle && liste.length ? `<a class="lenke" href="#/">${inn.alle} ${ikon('chev')}</a>` : '',
    })
  })
  return `<div class="side">
    <div class="sidehode">
      <div class="sidehode__tekst">
        <h1 class="sidetittel fagmiljo" tabindex="-1">${fm.navn}${
          flere
            ? `<button type="button" class="fagmiljo__velg" data-handling="popover" data-arg="fagmiljo" aria-expanded="${
                S.popover === 'fagmiljo'
              }" aria-label="Bytt fagmiljø">${ikon('chev')}</button>`
            : ''
        }${S.popover === 'fagmiljo' ? fagmiljovelger() : ''}</h1>
      </div>
      ${knapp('Tilpass forsiden', 'modal', { variant: 'stille', ikonnavn: 'gears', arg: 'tilpass', modalfra: 'tilpass' })}
    </div>
    <section class="hero" aria-labelledby="hero-tittel">
      <span class="hero__ikon" aria-hidden="true">${ikon('interp')}</span>
      <div><h2 id="hero-tittel">Fortolkning av analysesvar</h2><p>Søk etter analytt og hent fortolkningskommentar.</p></div>
      <a class="pilleknapp" data-variant="primar" data-storrelse="stor" href="#/fortolkning">Åpne fortolkning ${ikon('chev')}</a>
    </section>
    <div class="rutenett">${kort.join('')}</div>
  </div>`
}

function fagmiljovelger() {
  return `<div class="popover" role="dialog" aria-label="Velg fagmiljø">
    ${FAGMILJOER.map(
      (f) => `<button type="button" class="valg" data-handling="fagmiljo" data-arg="${f.id}" aria-current="${f.id === S.fagmiljo}">
      ${ikon(f.id === 'sandkasse' ? 'sandkasse' : 'laboratorium')}<span class="valg__tekst">${f.navn}<small>${f.merknad}</small></span>
      ${f.id === S.fagmiljo ? ikon('yes', 'Valgt') : f.ikkeMedlem ? '<span class="merke">Ikke medlem</span>' : ''}</button>`,
    ).join('')}
    <p class="tom" style="padding:var(--rom-3) var(--rom-4) var(--rom-2)">Fortolkningen følger fagmiljøet. Fagsidene og gruppene dine er de samme.</p>
  </div>`
}

function fortolkning(r) {
  return `<div class="fortolkning">
    <div class="fortolkning__topp">
      <a class="pilleknapp" data-variant="stille" href="#/">${ikon('back')}Til forsiden</a>
      ${r.side === 'analytt' ? `<a class="pilleknapp" data-variant="stille" href="#/fortolkning"><kbd>Esc</kbd>Tilbake</a>` : ''}
    </div>
    ${
      r.side === 'analytt'
        ? `<h1 class="sidetittel" tabindex="-1">Kvetiapin</h1>
           <div class="plassholder">Fortolkningens trinn, taster og kommentarer er <strong>uendret</strong>.<br/>Escape går bakover gjennom trinnene og stopper på søket.</div>`
        : `<h1 class="skjult" tabindex="-1">Fortolkning</h1>
           <div class="analyttsok" data-autofokus tabindex="0">${ikon('search')}Begynn å skrive navnet på en analytt eller kode.</div>
           <p class="tom">Eksempel: <a class="lenke" href="#/fortolkning/kve">Kvetiapin</a>. Escape her gjør ingenting; forsiden nås med knappen over.</p>`
    }
  </div>`
}

function fagside(r) {
  const navn = r.stoff[0].toUpperCase() + r.stoff.slice(1)
  const seksjoner = [
    ['indik', 'Indikasjon og virkning', 'indikasjon'],
    ['dose', 'Dosering', 'dosering'],
    ['pk', 'Farmakokinetikk', 'farmakokinetikk'],
    ['inter', 'Interaksjoner', 'interaksjoner'],
    ['serum', 'Serumkonsentrasjoner', 'serum'],
  ]
  return `<div class="side" style="width:min(100%, var(--bredde-infoside))">
    ${tilbakelenke()}
    <div class="metalinje">Fagside · Antipsykotika</div>
    <h1 class="monograf__navn" tabindex="-1">${navn}</h1>
    ${seksjoner
      .map(
        ([i, t, id]) => `<div class="seksjon"${r.seksjon === id ? ' style="outline:var(--kant-tykk) solid var(--aksent);outline-offset:var(--rom-2);border-radius:var(--runding-felt)"' : ''}>
        <span class="seksjon__ikon">${ikon(i)}</span><span style="flex:1">${t}</span>${
          r.seksjon === id ? '<span class="merke" data-tone="aksent">Oppdatert 17.11</span>' : ''
        }${ikon('chev')}</div>`,
      )
      .join('')}
  </div>`
}

function grupperside() {
  const aktive = GRUPPER.filter((g) => !g.arkivert)
  const arkiv = GRUPPER.filter((g) => g.arkivert)
  const rad = (g) => `<li><a class="liste__rad" href="#/grupper/${g.id}">
    <span class="liste__navn">${g.navn}</span>
    <span class="liste__meta">${g.hvor} · ${g.medlemmer.length} medlemmer · ${g.rolle}</span>
    <span class="liste__hoyre">${g.arkivert ? '<span class="merke">Arkivert</span>' : ''}${
      g.nytt ? `<span class="merke" data-tone="aksent">${g.nytt} nye</span>` : ''
    }${ikon('chev')}</span></a></li>`
  return `<div class="side" style="width:min(100%, 52rem)">
    ${tilbakelenke()}
    <div class="sidehode" style="margin-top:var(--rom-3)">
      <div class="sidehode__tekst"><h1 class="sidetittel" tabindex="-1">Grupper</h1></div>
      ${knapp('Opprett gruppe', 'modal', { variant: 'primar', arg: 'nygruppe', modalfra: 'nygruppe' })}
    </div>
    <div class="invitasjon" role="region" aria-label="Invitasjon">
      <p><strong>Kari Nordmann</strong> har invitert deg til <strong>Metodeforum</strong>.<br/><small>På tvers av fagmiljøer · 6 medlemmer</small></p>
      <div class="knapperad">${knapp('Godta', 'tilbake', { variant: 'primar' })}${knapp('Avslå', 'tilbake')}</div>
    </div>
    <div class="verktoylinje"><div class="felt" data-bred>${ikon('search')}Søk i gruppene</div></div>
    <ul class="liste">${aktive.map(rad).join('')}</ul>
    <h2 class="panel__tittel" style="margin:var(--rom-9) 0 var(--rom-4)">Arkiverte</h2>
    <ul class="liste">${arkiv.map(rad).join('')}</ul>
  </div>`
}

function gruppeside(r) {
  const g = gruppe(r.gruppe)
  const chatUleste = samtale(g.id)?.uleste || 0
  return `<div class="side">
    ${tilbakelenke()}
    <div class="sidehode" style="margin-top:var(--rom-3)">
      <div class="sidehode__tekst">
        <h1 class="sidetittel" tabindex="-1">${g.navn}</h1>
        <p class="ingress">${g.beskrivelse}</p>
        <div class="gruppehode__linje">
          <span class="avatarer" aria-hidden="true">${g.medlemmer.slice(0, 4).map((n) => `<span class="avatar">${initialer(n)}</span>`).join('')}</span>
          <button type="button" class="lenke" data-handling="modal" data-arg="medlemmer" data-modalfra="medlemmer">${g.medlemmer.length} medlemmer · Vis medlemmer</button>
          <span>${g.hvor}</span>
          <span class="merke">${g.rolle}</span>
        </div>
      </div>
      ${knapp('Gruppeinnstillinger', 'modal', { variant: 'stille', ikonnavn: 'gears', arg: 'gruppeinnstillinger', modalfra: 'gruppeinnstillinger' })}
    </div>
    <div style="margin-bottom:var(--d0-panelluft)">${panel('aktivitet', {
      tittel: 'Siste aktivitet',
      ikonnavn: 'history',
      innhold: hendelser([
        { ikon: 'comment', tittel: 'Ola Nordmann kommenterte idéen «Vis enhet i kopiert kommentar»', hvor: 'Idé', tid: '14.10', til: `#/grupper/${g.id}/ideer/i2`, ulest: true },
        { ikon: 'oppgaver', tittel: 'Oppgaven «Oppdatere rutine for nye analytter» er oppdatert', hvor: 'Oppgave · Tildelt deg', tid: '13.58', til: `#/grupper/${g.id}/oppgaver/o1`, ulest: true },
        { ikon: 'samtale', tittel: '2 nye meldinger i gruppechatten', hvor: 'Gruppechat', tid: '14.02', til: `#/chat/gruppe/${g.id}` },
      ]),
    })}</div>
    <div class="rutenett">
      ${panel('ideer', {
        tittel: 'Idéer',
        ikonnavn: 'idea',
        innhold: '<p class="signal">3 åpne · 2 nye<small>Sist: «Felles mal for møtereferat»</small></p>',
        fot: `<a class="pilleknapp" href="#/grupper/${g.id}/ideer">Åpne idéer</a>`,
      })}
      ${panel('oppgaver', {
        tittel: 'Oppgaver',
        ikonnavn: 'oppgaver',
        innhold: '<p class="signal">2 pågår · 1 tildelt deg<small>Nærmeste frist 22.11</small></p>',
        fot: `<a class="pilleknapp" href="#/grupper/${g.id}/oppgaver">Åpne oppgaver</a>`,
      })}
      ${panel('diskusjoner', {
        tittel: 'Diskusjoner',
        ikonnavn: 'diskusjon',
        innhold: '<p class="signal">1 tråd med noe nytt<small>«Hvordan bruker vi sandkassen?»</small></p>',
        fot: knapp('Åpne diskusjoner', 'diskusjoner'),
      })}
      ${panel('chat', {
        tittel: 'Gruppechat',
        ikonnavn: 'samtale',
        innhold: `<p class="signal">${chatUleste ? `${chatUleste} uleste meldinger` : 'Ingen uleste meldinger'}<small>Åpnes i chatmenyen, siden blir stående</small></p>`,
        fot: knapp('Åpne chat', 'chat-apne', { arg: g.id }),
      })}
    </div>
  </div>`
}
HANDLINGER['chat-apne'] = (arg) => apneChat(arg)

function chatside(r) {
  const valgt = r.samtale ? samtale(r.samtale) : null
  return `<div class="chatside__hode">
    <h1 class="sidetittel" tabindex="-1">Grupper og samtaler</h1>
    ${knapp('Gjenopprett', 'gjenopprett-chat', { variant: 'stille', ikonnavn: 'helsideAv', etikett: `Gjenopprett chatmenyen på ${sidetittel(tilbakeMaal())}` })}
  </div>
  <div class="chatside"${valgt ? ' data-samtale' : ''}>
    <section aria-label="Samtaleoversikt"><div class="chatmeny__kropp" style="padding:0">${chatoversikt({ helside: true })}</div>
    <div class="chatmeny__fot" style="padding-inline:var(--rom-2)">${bryter('dm', 'Tillat direktemeldinger', '', S.dm, 'dm')}${bryter('aktiv', 'Vis når jeg er aktiv', '', S.aktivstatus, 'aktivstatus')}</div></section>
    <section aria-label="Samtale">${valgt ? samtalevisning(valgt, { helside: true }) : '<p class="tom">Velg en samtale.</p>'}</section>
  </div>`
}

function ukjent() {
  return `<div class="side" style="width:min(100%, 40rem)">
    <h1 class="sidetittel" tabindex="-1">Siden finnes ikke</h1>
    <p class="ingress" style="margin:var(--rom-4) 0 var(--rom-7)">Lenken kan være gammel, eller du har ikke tilgang til det den viser til.</p>
    <a class="pilleknapp" data-variant="primar" href="#/">Til forsiden</a>
  </div>`
}

/* ---------------------------------------------------------------------------
 * Chatmenyen
 * ------------------------------------------------------------------------- */
function chatoversikt({ helside = false } = {}) {
  const grupper = GRUPPER.filter((g) => !g.arkivert)
  return `
    <button type="button" class="trekkspill" data-handling="gruppeskuff" aria-expanded="${S.gruppeskuff}">${ikon('chev')}<span>Mine grupper</span><small>${grupper.length}</small></button>
    ${
      S.gruppeskuff
        ? `<div>${grupper
            .map((g) => `<a class="gruppelenke" href="#/grupper/${g.id}">${ikon('sandkasse')}<span>${g.navn}</span><small>${g.hvor === 'På tvers av fagmiljøer' ? 'På tvers' : 'Lokal'}</small></a>`)
            .join('')}<a class="gruppelenke lenke" href="#/grupper"><span>Alle grupper</span>${ikon('chev')}</a></div>`
        : ''
    }
    <hr class="skillelinje" />
    <div class="panel__hode" style="padding:var(--rom-2) var(--rom-2) var(--rom-3)">
      <h3 class="panel__tittel" style="font-size:1.125rem">Samtaler</h3>
      ${knapp('Ny chat', 'chat-visning', { ikonnavn: 'plus', arg: 'ny', variant: 'stille' })}
    </div>
    <div class="felt" style="margin:0 var(--rom-2) var(--rom-3)">${ikon('search')}Søk i samtalene</div>
    <div role="list">${SAMTALER.map(
      (s) => `<button type="button" role="listitem" class="samtale" data-handling="chat-visning" data-arg="${s.id}"${s.uleste ? ' data-ulest' : ''} aria-current="${
        S.chatVisning === s.id && helside
      }"${s.id === SAMTALER[0].id ? ' data-autofokus' : ''}>
      <span class="avatar" data-stor aria-hidden="true">${s.type === 'gruppe' ? ikon('sandkasse') : initialer(s.navn)}${
        s.aktiv && S.aktivstatus !== null ? '<span class="aktiv"></span>' : ''
      }</span>
      <span class="samtale__navn">${s.navn}${s.aktiv ? '<span class="skjult"> (aktiv nå)</span>' : ''}</span>
      <span class="samtale__type">${s.type === 'gruppe' ? 'Gruppechat' : 'Direktemelding'}</span>
      <span class="samtale__hoyre"><span>${s.tid}</span>${
        s.uleste ? `<span class="uleste"><span aria-hidden="true">${s.uleste}</span><span class="skjult">${s.uleste} uleste</span></span>` : ''
      }</span></button>`,
    ).join('')}</div>`
}

function samtalevisning(s, { helside = false } = {}) {
  const g = s.type === 'gruppe' ? gruppe(s.id) : null
  const meldinger = MELDINGER[s.id] || []
  return `<div class="samtalehode">
      ${helside && !smal() ? '' : ikonknapp('back', 'Til alle samtaler', 'chat-visning', { arg: 'oversikt', ekstra: 'data-autofokus' })}
      <span class="avatar" data-stor aria-hidden="true">${g ? ikon('sandkasse') : initialer(s.navn)}</span>
      <span class="samtalehode__tekst"><strong>${s.navn}</strong><small>${
        g ? `Gruppechat · ${g.medlemmer.length} medlemmer` : `Direktemelding · @${s.bruker}${s.aktiv ? ' · Aktiv nå' : ''}`
      }</small></span>
      ${g ? `<a class="lenke" href="#/grupper/${g.id}">Til gruppen</a>` : ''}
    </div>
    <div class="traad" role="log" aria-label="Meldinger">
      <button type="button" class="lenke" style="align-self:center">Vis eldre meldinger</button>
      ${meldinger
        .map((m) =>
          m.dato
            ? `<div class="dato">${m.dato}</div>`
            : `<div class="melding"${m.egen ? ' data-egen' : ''}><small>${m.egen ? 'Du' : m.fra} · ${m.tid}</small><p>${m.tekst}</p></div>`,
        )
        .join('')}
    </div>
    ${
      s.sperret
        ? `<div class="sperret" role="status">${ikon('lock')}<span><strong>${s.navn}</strong> kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.</span></div>`
        : `<div class="skrivefelt"><textarea rows="1" aria-label="Skriv en melding til ${s.navn}" placeholder="Skriv en melding"></textarea>${knapp('Send', 'tilbake', { variant: 'primar' })}</div>`
    }`
}

function nyChat() {
  if (!S.dm)
    return `<div class="samtalehode">${ikonknapp('back', 'Til alle samtaler', 'chat-visning', { arg: 'oversikt', ekstra: 'data-autofokus' })}<span class="samtalehode__tekst"><strong>Ny direktemelding</strong></span></div>
    <p class="tom">Slå på direktemeldinger for å starte en samtale. Gruppechattene virker uansett.</p>
    ${bryter('dm2', 'Tillat direktemeldinger', '', S.dm, 'dm')}`
  return `<div class="samtalehode">${ikonknapp('back', 'Til alle samtaler', 'chat-visning', { arg: 'oversikt' })}<span class="samtalehode__tekst"><strong>Ny direktemelding</strong><small>Personer i alle fagmiljøer som tillater direktemeldinger</small></span></div>
    <div class="felt" style="margin:var(--rom-5) 0 var(--rom-3);color:var(--blekk)" data-autofokus tabindex="0">${ikon('search')}nord</div>
    ${['Ola Nordmann|olanor|Finnes alt en samtale', 'Nora Nordby|nornor|']
      .map((x) => {
        const [navn, bruker, merknad] = x.split('|')
        return `<button type="button" class="samtale"><span class="avatar" data-stor aria-hidden="true">${initialer(navn)}</span><span class="samtale__navn">${navn}</span><span class="samtale__type">@${bruker}${
          merknad ? ` · ${merknad}` : ''
        }</span></button>`
      })
      .join('')}
    <p class="tom">Kari Nordmann vises ikke, fordi hun ikke tillater direktemeldinger.</p>`
}

function chatmeny() {
  if (S.chat !== 'apen' || S.chatParkert || lesRute().side === 'chat') return ''
  const s = samtale(S.chatVisning)
  const kropp = S.chatVisning === 'ny' ? nyChat() : s ? samtalevisning(s) : chatoversikt()
  return `<aside class="chatmeny" aria-label="Grupper og samtaler"${S.chatbredde ? ` style="--chatbredde:${S.chatbredde}rem"` : ''}>
    <div class="chatmeny__hode">
      <h2>Grupper og samtaler</h2>
      ${ikonknapp('helside', 'Utvid til helside', 'utvid-chat')}
      ${ikonknapp('close', 'Lukk chatmenyen', 'lukk-chat')}
    </div>
    <div class="chatmeny__kropp">${kropp}</div>
    ${
      s || S.chatVisning === 'ny'
        ? ''
        : `<div class="chatmeny__fot">${bryter('dm', 'Tillat direktemeldinger', S.dm ? 'Andre kan finne deg og skrive til deg' : 'Ingen kan finne deg eller sende nye meldinger', S.dm, 'dm')}
           ${bryter('aktiv', 'Vis når jeg er aktiv', '', S.aktivstatus, 'aktivstatus')}</div>`
    }
    <button type="button" class="kanthandtak" role="separator" aria-orientation="vertical" aria-label="Bredden på chatmenyen" aria-valuenow="${Math.round(
      S.chatbredde || 24,
    )}" aria-valuemin="20" aria-valuemax="40"></button>
  </aside>`
}

function chatboble() {
  if (S.chat === 'apen' && !S.chatParkert) return ''
  const uleste = SAMTALER.reduce((n, s) => n + s.uleste, 0)
  return `<button type="button" class="chatboble" data-handling="chat" aria-label="Chat, ${uleste} uleste" title="Grupper og samtaler">${ikon('samtale')}${
    uleste ? `<span class="teller" data-stille aria-hidden="true">${uleste}</span>` : ''
  }</button>`
}

function diskusjonslag(r) {
  if (r.side !== 'fagside' && r.side !== 'gruppe') return ''
  if (S.diskusjoner !== 'apen')
    return `<button type="button" class="diskusjonsboble" data-handling="diskusjoner" aria-label="Diskusjoner" title="Diskusjoner">${ikon('diskusjon')}</button>`
  const om = r.side === 'fagside' ? r.stoff[0].toUpperCase() + r.stoff.slice(1) : gruppe(r.gruppe).navn
  return `<aside class="diskusjonsmeny" aria-label="Diskusjoner om ${om}">
    <div class="chatmeny__hode" style="padding:0 0 var(--rom-3)"><h2>Diskusjoner om ${om}</h2>${ikonknapp('helside', 'Maksimer', 'diskusjoner')}${ikonknapp('close', 'Lukk', 'diskusjoner')}</div>
    ${hendelser([
      { ikon: 'diskusjon', tittel: 'Dosering ved nedsatt nyrefunksjon', hvor: '4 innlegg · 1 nytt', tid: 'I går', til: '#/diskusjon/d3', ulest: true },
      { ikon: 'diskusjon', tittel: 'Hvilken kilde bruker vi for t½?', hvor: '2 innlegg', tid: '10.11', til: '#/diskusjon/d2' },
    ])}
    <p class="tom" style="margin-top:auto">Uendret meny (se åpen PR om boblen). Bare samspillet med chatmenyen er nytt.</p>
  </aside>`
}

/* ---------------------------------------------------------------------------
 * Hovedmenyen
 * ------------------------------------------------------------------------- */
function hovedmeny(r) {
  if (!S.hovedmeny) return ''
  const rad = (href, ikonnavn, tekst, aktiv, hoyre = '') =>
    `<a class="menyrad" href="${href}"${aktiv ? ' aria-current="page"' : ''}>${ikon(ikonnavn)}<span>${tekst}</span>${hoyre}</a>`
  return `<div class="hovedmeny-slor"></div><aside class="hovedmeny" aria-label="Hovedmeny">
    <div class="hovedmeny__hode"><h2>Meny</h2>${ikonknapp('close', 'Lukk hovedmenyen', 'lukk-hovedmeny', { variant: 'hevet', ekstra: 'data-autofokus' })}</div>
    <nav>
      ${rad('#/', 'hl', 'Forsiden', r.side === 'forside')}
      ${rad('#/fortolkning', 'interp', 'Fortolkning', r.side === 'fortolkning' || r.side === 'analytt')}
      ${rad('#/grupper', 'sandkasse', 'Grupper', r.side === 'grupper' || r.side === 'gruppe', '<small>1 invitasjon</small>')}
      ${rad('#/chat', 'samtale', 'Chat', r.side === 'chat', '<small>3 uleste</small>')}
      ${rad('#/forslag', 'foresla', 'Endringsforslag', r.side === 'forslag', '<small>3 til deg</small>')}
      <p class="menygruppe">For hele appen</p>
      ${rad('#/ide/liste', 'idea', 'Idéer for appen', false)}
      ${rad('#/oppgaver', 'ideoppgaver', 'Planlagte oppgaver', false, '<small>Systemarkitekt</small>')}
      ${rad('#/admin', 'shield', 'Administrasjon', false)}
      <p class="menygruppe">Stoffregister og verktøy (uendret)</p>
      <div class="faner" role="tablist" style="margin:0 var(--rom-2) var(--rom-3)"><button role="tab" aria-selected="true">Stoffregister</button><button role="tab" aria-selected="false">Verktøy</button></div>
      ${rad('#/stoffregister', 'star', 'Favoritter', false, ikon('chev'))}
      ${rad('#/stoffregister', 'stoffregister', 'Antipsykotika', false, ikon('chev'))}
      ${rad('#/stoffregister', 'stoffregister', 'Antidepressiver', false, ikon('chev'))}
    </nav>
  </aside>`
}

/* ---------------------------------------------------------------------------
 * Modalene
 * ------------------------------------------------------------------------- */
function modalramme({ meta, tittel, innhold, fot, storrelse, etikett, lukk = 'Lukk' }) {
  return `<div class="slor"><div class="modal" role="dialog" aria-modal="true" aria-label="${etikett || tittel}"${
    storrelse ? ` data-storrelse="${storrelse}"` : ''
  }>
    <div class="modal__hode"><div class="modal__topp"><span class="metalinje">${meta || ''}</span>${ikonknapp('close', lukk, 'lukk-modal', {
      ekstra: 'data-autofokus',
    }).replace('class="ikonknapp"', 'class="ikonknapp lukk"')}</div>
    <h2 class="modal__tittel">${tittel}</h2></div>
    ${innhold}
    ${fot ? `<div class="modal__fot">${fot}</div>` : ''}
  </div></div>`
}

function modal(r) {
  if (erArbeidsflate(r)) return arbeidsflate(r)
  const g = gruppe(r.gruppe)
  switch (S.modal) {
    case 'tilpass':
      return modalramme({
        meta: 'Forsiden',
        tittel: 'Tilpass forsiden',
        innhold: `<div class="modal__kropp">
          <div><div class="modulrad" data-fast><span>Fortolkning</span><span class="merke">Alltid øverst</span><span></span></div>
          ${S.moduler
            .map(
              (m, i) => `<div class="modulrad">${bryter(`m-${m.id}`, m.navn, '', m.paa, 'modul').replace(
                `data-handling="modul"`,
                `data-handling="modul" data-arg="${m.id}"`,
              )}
              <span class="knapperad">${ikonknapp('opp', `Flytt ${m.navn} opp`, 'flytt', { arg: `${m.id}:-1` })}${ikonknapp('ned', `Flytt ${m.navn} ned`, 'flytt', {
                arg: `${m.id}:1`,
              })}</span></div>`,
            )
            .join('')}</div>
          <p class="tom">Valgene følger deg på alle maskiner. Innholdet følger fagmiljøet du har valgt.</p>
        </div>`,
        fot: `${knapp('Gjenopprett standard', 'standard', { variant: 'stille' })}${knapp('Ferdig', 'lukk-modal', { variant: 'primar' })}`,
      })
    case 'medlemmer':
      return modalramme({
        meta: g.navn,
        tittel: 'Medlemmer',
        innhold: `<div class="modal__kropp">
          <div class="verktoylinje" style="margin:0"><div class="felt" data-bred>${ikon('user')}Inviter med brukernavn</div>${knapp('Inviter', 'tilbake')}</div>
          <div>${g.medlemmer
            .map(
              (n, i) => `<div class="medlem"><span class="avatar" data-stor aria-hidden="true">${initialer(n)}</span>
              <span>${n}${i === 0 ? ' (deg)' : ''}<small>@${n.split(' ')[0].toLowerCase().slice(0, 3)}${n.split(' ')[1].toLowerCase().slice(0, 3)} · ${
                i % 3 === 1 ? 'Fagmiljø B' : 'OUS Klinisk farmakologi'
              }</small></span>
              <select class="velger" aria-label="Rolle for ${n}"><option>${i === 0 ? 'Ansvarlig' : i === 2 ? 'Moderator' : 'Medlem'}</option></select>
              ${i === 0 ? '<span></span>' : ikonknapp('close', `Fjern ${n} fra gruppen`, 'tilbake')}</div>`,
            )
            .join('')}</div>
          <p class="tom">1 invitasjon venter på svar: Nora Nordby.</p>
        </div>`,
      })
    case 'gruppeinnstillinger':
      return modalramme({
        meta: g.navn,
        tittel: 'Gruppeinnstillinger',
        innhold: `<div class="modal__kropp">
          <div class="felt">Sandkassegruppen</div>
          <div class="felt" style="height:auto;padding-block:var(--rom-4);border-radius:var(--runding-felt)">${g.beskrivelse}</div>
          <hr class="skillelinje" />
          <div class="knapperad">${knapp('Arkiver gruppen', 'tilbake', { ikonnavn: 'arkiv' })}${knapp('Forlat gruppen', 'tilbake', { ikonnavn: 'logout' })}</div>
          <p class="tom">Begge spør om bekreftelse først, som i dag.</p>
        </div>`,
        fot: `${knapp('Avbryt', 'lukk-modal', { variant: 'stille' })}${knapp('Lagre', 'lukk-modal', { variant: 'primar' })}`,
      })
    case 'nygruppe':
      return modalramme({
        meta: 'Grupper',
        tittel: 'Opprett gruppe',
        innhold: `<div class="modal__kropp">
          <div class="felt">Navn</div>
          <div class="felt" style="height:5rem;align-items:flex-start;padding-top:var(--rom-4);border-radius:var(--runding-felt)">Beskrivelse (valgfritt)</div>
          <fieldset style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:var(--rom-3)"><legend class="panel__tittel" style="margin-bottom:var(--rom-3)">Hvem kan bli med?</legend>
            <label class="valg" aria-current="true"><input type="radio" name="hvor" checked /> <span class="valg__tekst">Bare OUS Klinisk farmakologi<small>Lokal gruppe</small></span></label>
            <label class="valg"><input type="radio" name="hvor" /> <span class="valg__tekst">På tvers av fagmiljøer<small>Alle aktive brukere kan inviteres</small></span></label>
          </fieldset>
        </div>`,
        fot: `${knapp('Avbryt', 'lukk-modal', { variant: 'stille' })}${knapp('Opprett gruppe', 'lukk-modal', { variant: 'primar' })}`,
      })
    case 'innstillinger':
      return modalramme({
        meta: 'Konto',
        tittel: 'Innstillinger',
        innhold: `<div class="modal__kropp">
          <div class="faner" role="tablist"><button role="tab" aria-selected="false">Visning</button><button role="tab" aria-selected="true">Chat</button></div>
          ${bryter('dm3', 'Tillat direktemeldinger', 'Når den er på, kan personer i alle fagmiljøer finne deg og skrive til deg. Når den er av, kan ingen sende deg nye meldinger, men samtalene dine blir ikke slettet.', S.dm, 'dm')}
          ${bryter('aktiv2', 'Vis når jeg er aktiv', 'Andre ser en prikk mens du bruker appen. Ingen ser når du sist var innom.', S.aktivstatus, 'aktivstatus')}
          <p class="tom">Samme valg som nederst i chatmenyen.</p>
        </div>`,
      })
    default:
      return ''
  }
}

/* Den store arbeidsflaten for idéer eller oppgaver i en gruppe, med egen adresse. */
function arbeidsflate(r) {
  const g = gruppe(r.gruppe)
  const ideer = r.flate === 'ideer'
  const liste = ideer ? IDEER : OPPGAVER
  const valgt = liste.find((x) => x.id === r.mal) || (smal() ? null : liste[0])
  return modalramme({
    meta: g.navn,
    tittel: ideer ? `Idéer for ${g.navn}` : `Oppgaver for ${g.navn}`,
    storrelse: 'arbeidsflate',
    lukk: `Lukk og gå tilbake til ${sidetittel(arbeidsflateMaal(r))}`,
    innhold: `<div style="display:flex;gap:var(--rom-4);flex-wrap:wrap;align-items:center;padding:var(--rom-4) var(--rom-8);border-bottom:var(--kant) solid var(--linje)">
        <div class="faner" role="tablist" style="background:var(--flate-hevet)">${(ideer ? ['Åpne', 'Utført', 'Alle'] : ['Mine', 'Pågår', 'Alle'])
          .map((f, i) => `<button role="tab" aria-selected="${i === 0}">${f}</button>`)
          .join('')}</div>
        <span style="flex:1"></span>
        ${knapp(ideer ? 'Ny idé' : 'Ny oppgave', 'tilbake', { variant: 'primar' })}
      </div>
      <div class="delt"${valgt && r.mal ? ' data-detalj' : ''}>
        <div class="delt__liste" role="list">${liste
          .map(
            (x) => `<a role="listitem" class="kort" href="#/grupper/${g.id}/${r.flate}/${x.id}" aria-current="${valgt?.id === x.id}">
            <span class="kort__tittel">${x.nytt ? '<span class="ulestprikk" aria-hidden="true"></span><span class="skjult">Nytt: </span>' : ''}${x.tittel}</span>
            <span class="kort__meta"><span class="merke">${x.status}</span>${x.meta}</span></a>`,
          )
          .join('')}</div>
        <div class="delt__detalj">${
          valgt
            ? `${smal() ? `<a class="lenke tilbake" href="#/grupper/${g.id}/${r.flate}">${ikon('back')}Alle ${ideer ? 'idéer' : 'oppgaver'}</a>` : ''}
              <div class="metalinje">${valgt.status}</div>
              <h3 class="modal__tittel" style="font-size:var(--tekst-seksjon);margin:var(--rom-3) 0 var(--rom-5)">${valgt.tittel}</h3>
              <p class="lesetekst">${
                ideer
                  ? 'Når en kommentar kopieres, kan enheten følge med, så den ikke må skrives inn for hånd.'
                  : 'Gå gjennom rutinen og legg inn kommentarene fra møtet. Del et utkast i gruppen før fristen.'
              }</p>
              <h4 class="panel__tittel" style="margin:var(--rom-8) 0 var(--rom-4)">Kommentarer</h4>
              <div style="display:flex;flex-direction:column;gap:var(--rom-4)">
                <div class="kommentar"><small>Anne Berg · I går</small>Enig, dette ville spart tid.</div>
                <div class="kommentar"${r.mal === valgt.id ? ' data-fremhevet' : ''}><small>Ola Nordmann · 14.10${
                  r.mal === valgt.id ? ' · Lenken du fulgte' : ''
                }</small>Jeg har laget et forslag til hvordan det kan se ut.</div>
              </div>`
            : ''
        }</div>
      </div>`,
  })
}

/* ---------------------------------------------------------------------------
 * Hele skjermen
 * ------------------------------------------------------------------------- */
function render() {
  const r = lesRute()
  // Arbeidsflaten ligger over siden den lukkes til, så lukking viser det som lå under.
  const under = erArbeidsflate(r) ? bakgrunnForArbeidsflate(r) : r
  const html = document.documentElement
  html.dataset.chat = S.chat === 'apen' && !S.chatParkert && under.side !== 'chat' ? 'apen' : 'boble'
  html.dataset.diskusjoner = under.side === 'fagside' || under.side === 'gruppe' ? S.diskusjoner : ''
  if (S.chatbredde) html.style.setProperty('--chatbredde', `${S.chatbredde}rem`)
  const side = {
    forside,
    fortolkning,
    analytt: fortolkning,
    fagside,
    grupper: grupperside,
    gruppe: gruppeside,
    chat: chatside,
    forslag: ukjent,
    ukjent,
  }[under.side](under)
  document.getElementById('rot').innerHTML = `
    ${toppmeny(under)}
    <main class="app">${side}</main>
    ${r.side === 'chat' ? '' : chatboble()}
    ${chatmeny()}
    ${diskusjonslag(under)}
    ${hovedmeny(r)}
    ${modal(r)}
    ${prototypelinje()}`
  oppdaterEscapelinje()
}

/* ---------------------------------------------------------------------------
 * Prototypelinjen og forhåndsvalgte skjermer
 * ------------------------------------------------------------------------- */
const SKJERMER = {
  forside: { navn: 'Forside', hash: '#/' },
  'forside-tom': { navn: 'Forside, ny bruker', hash: '#/', s: { tom: true } },
  fagmiljo: { navn: 'Forside, bytt fagmiljø', hash: '#/', s: { popover: 'fagmiljo' } },
  tilpass: { navn: 'Tilpass forsiden', hash: '#/', s: { modal: 'tilpass', moduler: null } },
  fortolkning: { navn: 'Fortolkningssøket', hash: '#/fortolkning', fra: ['#/'] },
  analytt: { navn: 'Konkret fortolkning', hash: '#/fortolkning/kve', fra: ['#/', '#/fortolkning'] },
  grupper: { navn: 'Grupper', hash: '#/grupper', fra: ['#/'] },
  nygruppe: { navn: 'Opprett gruppe', hash: '#/grupper', fra: ['#/'], s: { modal: 'nygruppe' } },
  gruppe: { navn: 'Gruppedashboard', hash: '#/grupper/sandkasse', fra: ['#/', '#/grupper'] },
  medlemmer: { navn: 'Medlemmer', hash: '#/grupper/sandkasse', fra: ['#/', '#/grupper'], s: { modal: 'medlemmer' } },
  ideer: { navn: 'Idéer for gruppen (åpnet fra forsiden)', hash: '#/grupper/sandkasse/ideer/i2', fra: ['#/'] },
  oppgaver: { navn: 'Oppgaver for gruppen (åpnet fra gruppen)', hash: '#/grupper/sandkasse/oppgaver/o1', fra: ['#/', '#/grupper/sandkasse'] },
  'chat-apen': { navn: 'Chatmeny åpen', hash: '#/', s: { chat: 'apen' } },
  'chat-samtale': { navn: 'Chatmeny med samtale, bred', hash: '#/grupper/sandkasse', fra: ['#/', '#/grupper'], s: { chat: 'apen', chatVisning: 'sandkasse', chatbredde: 32 } },
  'chat-ny': { navn: 'Ny direktemelding', hash: '#/', s: { chat: 'apen', chatVisning: 'ny', dm: true } },
  'chat-sperret': { navn: 'Mottaker tar ikke imot', hash: '#/', s: { chat: 'apen', chatVisning: 'kari' } },
  'chat-helside': { navn: 'Fullsidechat', hash: '#/chat/gruppe/sandkasse', fra: ['#/', '#/grupper/sandkasse'], s: { chatVisning: 'sandkasse' } },
  hovedmeny: { navn: 'Hovedmeny (chat parkert)', hash: '#/', s: { chat: 'apen', hovedmeny: true, chatParkert: true } },
  samtidig: { navn: 'Fagside med chat og diskusjoner', hash: '#/stoff/kvetiapin/dosering', fra: ['#/'], s: { chat: 'apen', chatVisning: 'ola', diskusjoner: 'apen' } },
  konto: { navn: 'Kontomenyen', hash: '#/', s: { popover: 'konto' } },
  innstillinger: { navn: 'Innstillinger, chat', hash: '#/', s: { modal: 'innstillinger' } },
  ukjent: { navn: 'Ukjent adresse', hash: '#/finnes-ikke' },
}

function velgSkjerm(id) {
  const sk = SKJERMER[id]
  if (!sk) return
  S = { ...STANDARD(), ...(sk.s || {}) }
  if (!S.moduler) S.moduler = MODULER.map((m) => ({ ...m }))
  // Inngangsveien til en forhåndsvalgt skjerm finnes ikke i nettleserhistorikken.
  S.fra = [...(sk.fra || [])]
  S.virtuell = S.fra.length
  S.skjerm = id
  if (MINNE) minneadresse = sk.hash
  else history.replaceState({ dybde: S.fra.length }, '', location.pathname + location.search + sk.hash)
  etterNavigering({ beholdLag: true })
}

function prototypelinje() {
  return `<div class="proto" role="region" aria-label="Prototypen (ikke en del av designet)">
    <strong>D0-prototype</strong>
    <label>Skjerm <select id="skjermvalg">${Object.entries(SKJERMER)
      .map(([id, s]) => `<option value="${id}"${S.skjerm === id ? ' selected' : ''}>${s.navn}</option>`)
      .join('')}</select></label>
    <button type="button" data-handling="tema">${document.documentElement.dataset.tema === 'moerkt' ? 'Lyst tema' : 'Mørkt tema'}</button>
    <span>Adresse: <code>${adressen()}</code></span>
    <span>Eksempeldata</span>
    <span class="proto__escape">Escape nå: <span id="escape-nå"></span></span>
  </div>`
}

/* Start */
;(() => {
  const p = new URLSearchParams(location.search)
  if (p.get('tema')) document.documentElement.dataset.tema = p.get('tema')
  if (p.has('ren')) document.documentElement.dataset.ren = ''
  if (p.get('skjerm')) velgSkjerm(p.get('skjerm'))
  else if (MINNE) velgSkjerm('forside')
  else {
    history.replaceState({ dybde: 0 }, '', location.hash || '#/')
    etterNavigering()
  }
})()
