/**
 * Måleren som legges inn i siden før appen starter (`addInitScript` i
 * `ytelse.ts`). Den skriver ingenting om brukeren og sender ingenting: den
 * noterer bare når kjente deler av siden først står ferdige, i
 * `performance.now()`-tid, ved første tegnede bilde (`requestAnimationFrame`)
 * etter en endring i siden.
 *
 * Merkene (`window.__ytelse.merker`), regnet fra sidens start eller fra siste
 * `nullstill()`:
 * - `skall`: toppmenyen med fagsøket.
 * - `forside`: «Åpne fortolkning» på forsiden.
 * - `forside_tittel`: fagmiljøets navn over forsiden (ikke lenger «henter»);
 *   med `forventetTittel` først når det er det navnet.
 * - `forside_paneler`: alle panelene på forsiden er hentet.
 * - `fagside_navn`, `fagside_innhold` (panelene hentet), `fagside_komplett`
 *   (ingen «Henter …» igjen på siden).
 * - `fortolkning`: søkefeltet i fortolkningen.
 * - `brukere`: listen over medlemmer under Administrasjon → Brukere.
 * - `personsok`: det første svaret i personsøket etter siste tastetrykk
 *   (treff, «Ingen treff.» eller en feil).
 * - `fagsok`, `fortolkning_treff`: første treff i fagsøket / analyttsøket;
 *   `fagsok_feil` når fagsøket sier at fagstoffet ikke ble hentet, og
 *   `fagsok_svar` det som kommer først av de to.
 *
 * I tillegg: lange oppgaver (over 50 ms), referanselisten på fagsiden hver
 * gang den endres (antall og et fingeravtrykk), og personsøkets visninger.
 */
;(() => {
  const y = {
    t0: 0,
    merker: {},
    lange: [],
    referanser: [],
    personsok: [],
    tast: null,
    forventetTittel: null,
    nullstill() {
      y.t0 = performance.now()
      y.merker = {}
      y.referanser = []
      y.personsok = []
      y.tast = null
    },
  }
  window.__ytelse = y
  try {
    new PerformanceObserver((liste) => {
      for (const e of liste.getEntries()) y.lange.push([e.startTime, e.duration])
    }).observe({ type: 'longtask', buffered: true })
  } catch {
    // Uten støtte for lange oppgaver.
  }
  // Personsøkets svar gjelder det som står etter siste tastetrykk: et svar som
  // stod midt i skrivingen (et søk komponenten husket) teller ikke.
  document.addEventListener(
    'keydown',
    () => {
      y.tast = performance.now()
      delete y.merker.personsok
    },
    true,
  )

  const q = (s) => document.querySelector(s)
  const synlig = (e) => e && (e.checkVisibility ? e.checkVisibility() : e.offsetParent !== null)
  const tekst = (e) => (e ? e.textContent.trim() : '')
  const regler = {
    skall: () => q('.toppmeny .toppmeny__sok input'),
    forside: () => q('.forside__hovedhandling button'),
    forside_tittel: () => {
      const h = q('.forside__tittel')
      return h && h.getAttribute('aria-busy') !== 'true' && tekst(h) && (!y.forventetTittel || tekst(h) === y.forventetTittel)
    },
    forside_paneler: () => {
      // Ved et fagmiljøbytte gjelder panelene først når det nye navnet står.
      if (y.forventetTittel && y.merker.forside_tittel === undefined) return false
      const p = document.querySelectorAll('.forside__paneler section.oppsummering')
      return p.length > 0 && [...p].every((x) => x.getAttribute('aria-busy') !== 'true')
    },
    fagside_navn: () => tekst(q('.stoffside .identitet__navn')),
    fagside_innhold: () => q('.stoffside__paneler[aria-busy="false"]'),
    fagside_komplett: () => {
      const s = q('.stoffside')
      return s && q('.stoffside__paneler[aria-busy="false"]') && !/Henter [^.]*…/.test(s.textContent)
    },
    fortolkning: () => synlig(q('input[aria-label="Søk etter analytt eller kode"]')),
    fortolkning_treff: () => synlig(q('.steg--sok .alternativer li')),
    brukere: () => q('.rollegrupper .brukerliste li'),
    fagsok: () => q('.fagsok__treff [role="option"]'),
    fagsok_feil: () => q('.fagsok__melding[role="alert"]'),
    fagsok_svar: () => q('.fagsok__treff [role="option"]') || q('.fagsok__melding[role="alert"]'),
    personsok: () => {
      if (y.tast === null) return false
      const m = tekst(q('.personsok__melding'))
      return m !== 'Søker …' && (q('.personsok__treff [role="option"]') || m === 'Ingen treff.' || q('.personsok [role="alert"]'))
    },
  }

  let ventende = false
  let forrigeRef = ''
  let forrigePs = ''
  const sjekk = () => {
    ventende = false
    const t = performance.now() - y.t0
    for (const [navn, regel] of Object.entries(regler)) {
      if (y.merker[navn] === undefined && regel()) y.merker[navn] = t
    }
    const liste = q('.referanseliste__liste')
    if (liste) {
      const avtrykk = [...liste.children].map((li) => `${li.getAttribute('value')}:${li.id}`).join('|')
      if (avtrykk !== forrigeRef) {
        forrigeRef = avtrykk
        y.referanser.push([t, liste.children.length, avtrykk])
      }
    }
    const ps = q('.personsok')
    if (ps) {
      const navn = [...ps.querySelectorAll('.personsok__treff [role="option"] .personsok__navn')].map(tekst)
      const tilstand = `${ps.querySelector('input')?.value}|${tekst(ps.querySelector('.personsok__melding'))}|${navn.join(',')}`
      if (tilstand !== forrigePs) {
        forrigePs = tilstand
        y.personsok.push([t, ps.querySelector('input')?.value ?? '', tekst(ps.querySelector('.personsok__melding')), navn])
      }
    }
  }
  const planlegg = () => {
    if (ventende) return
    ventende = true
    requestAnimationFrame(sjekk)
  }
  new MutationObserver(planlegg).observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
  planlegg()
})()
