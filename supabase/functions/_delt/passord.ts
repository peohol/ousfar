/**
 * Passordreglene i OUSFAR, og det midlertidige passordet en ny bruker får.
 *
 * Delt mellom appen og Edge-funksjonene, slik at feltet i nettleseren og
 * kontrollen på serveren krever nøyaktig det samme. Selve genereringen skjer
 * bare på serveren; appen bruker modulen til validering og testene til å
 * kontrollere at passordene faktisk blir sterke.
 */

/**
 * Korteste passord en bruker kan velge (`docs/s4-pilotplan.md` tiltak 6).
 *
 * Følger passordpolicyen i Supabase-prosjektet (`minimum_password_length`),
 * som håndhever lengden også når noen går utenom appen. De to skal alltid
 * være like; en test holder `supabase/config.toml` lik. Passord som alt er
 * satt, gjelder til de byttes.
 */
export const PASSORD_MINST = 12

/** Hjelpeteksten ved passordfeltene. */
export const PASSORDHJELP = `Minst ${PASSORD_MINST} tegn, uten brukernavnet. Flere ord satt sammen er lett å huske.`

/**
 * Ord som gjør et passord lett å gjette når resten bare er tall og tegn,
 * som «Passord2024!!» eller «sommersommer». Med små bokstaver og uten tall
 * og tegn. Lista er bevisst kort: lengden gjør det meste av jobben.
 */
const VANLIGE_ORD = [
  'passord', 'password', 'passw', 'qwerty', 'qwertz', 'asdf', 'zxcv', 'letmein', 'welcome', 'velkommen',
  'hemmelig', 'secret', 'admin', 'administrator', 'bruker', 'user', 'login', 'logginn', 'test', 'abc',
  'iloveyou', 'jegelskerdeg', 'monkey', 'dragon', 'football', 'fotball', 'sommer', 'vinter', 'host', 'var',
  'januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember',
  'norge', 'norway', 'oslo', 'ous', 'ousfar', 'far', 'farmakologi', 'klinisk', 'sykehus', 'lege',
]

/** Rekker som er lette å taste: tall, alfabetet og tastaturradene, også baklengs. */
const REKKER = ['0123456789', 'abcdefghijklmnopqrstuvwxyzæøå', 'qwertyuiopåasdfghjkløæzxcvbnm', 'qwertzuiopasdfghjklyxcvbnm']

/** Om teksten bare er ett og samme stykke gjentatt (`abcabcabc`), eller stykket selv. */
function gjentakAv(tekst: string, ord: string): boolean {
  return tekst.length >= ord.length && tekst.length % ord.length === 0 && ord.repeat(tekst.length / ord.length) === tekst
}

/**
 * Om passordet er et av de vanligste mønstrene: en sammenhengende rekke
 * (`123456789012`, `qwertyuiopå`), et vanlig ord med bare tall og tegn rundt,
 * eller et kort stykke gjentatt.
 */
function erVanlig(passord: string): boolean {
  const smaa = passord.toLowerCase()
  const iRekke = REKKER.some((r) => {
    const lang = r.repeat(Math.ceil(smaa.length / r.length) + 1)
    return lang.includes(smaa) || [...lang].reverse().join('').includes(smaa)
  })
  if (iRekke) return true
  const bokstaver = smaa.replace(/[^a-zæøå]/g, '')
  if (bokstaver === '') return [...new Set(smaa.replace(/[^0-9]/g, ''))].length <= 2
  if (VANLIGE_ORD.some((o) => gjentakAv(bokstaver, o))) return true
  for (let n = 1; n <= smaa.length / 2; n++) if (gjentakAv(smaa, smaa.slice(0, n))) return true
  return false
}

/** Lengden på et midlertidig passord. */
export const MIDLERTIDIG_PASSORD_LENGDE = 16

/**
 * Tegnene et midlertidig passord bygges av.
 *
 * Passordet skal leses opp eller skrives ned én gang, og deretter tastes inn
 * av noen andre. Tegn som lett forveksles visuelt er derfor tatt ut: store
 * `I` og `O`, liten `l`, og tallene `0` og `1`. Det står igjen 57 tegn, som på
 * seksten plasser gir godt over 90 bit entropi — langt mer enn nok.
 */
const SMAA = 'abcdefghijkmnopqrstuvwxyz'
const STORE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const TALL = '23456789'
const ALLE = SMAA + STORE + TALL

/**
 * Feilen med et nytt passord, i vanlig språk — eller `null` når det holder
 * mål: minst {@link PASSORD_MINST} tegn, uten brukernavnet, med minst fem
 * ulike tegn og ikke et av de vanligste mønstrene. Den samme regelen gjelder
 * i appen og på serveren.
 */
export function passordFeil(passord: string, brukernavn?: string | null): string | null {
  if (passord === '') return 'Skriv inn et passord.'
  if (passord.length < PASSORD_MINST) {
    return `Passordet må ha minst ${PASSORD_MINST} tegn.`
  }
  const navn = brukernavn?.trim().toLowerCase()
  if (navn && navn.length >= 3 && passord.toLowerCase().includes(navn)) return 'Passordet kan ikke inneholde brukernavnet.'
  if (new Set(passord).size < 5) return 'Passordet har for få ulike tegn.'
  if (erVanlig(passord)) return 'Passordet er for lett å gjette. Velg et annet, gjerne flere ord satt sammen.'
  return null
}

/**
 * Et tilfeldig heltall under `antall`, trukket fra kildens kryptografisk
 * sikre tilfeldighet.
 *
 * Byte-verdier som ikke går opp i `antall` forkastes i stedet for å tas modulo,
 * slik at alle tegn er like sannsynlige. Uten det ville de første tegnene i
 * tegnsettet blitt trukket litt oftere enn de siste.
 */
function tilfeldigTall(antall: number): number {
  const grense = Math.floor(256 / antall) * antall
  const bytes = new Uint8Array(1)
  for (;;) {
    crypto.getRandomValues(bytes)
    const verdi = bytes[0] as number
    if (verdi < grense) return verdi % antall
  }
}

/** Ett tilfeldig tegn fra et tegnsett. */
function tilfeldigTegn(tegnsett: string): string {
  return tegnsett[tilfeldigTall(tegnsett.length)] as string
}

/**
 * Et nytt midlertidig passord.
 *
 * Ett tegn hentes fra hver gruppe først, slik at passordet alltid har både
 * små bokstaver, store bokstaver og tall uansett hvor tilfeldigheten faller.
 * Resten fylles fra hele tegnsettet, og rekkefølgen stokkes til slutt — ellers
 * ville de tre første plassene vært forutsigbare.
 */
export function genererMidlertidigPassord(
  lengde: number = MIDLERTIDIG_PASSORD_LENGDE,
): string {
  if (lengde < PASSORD_MINST) {
    throw new Error(`Et midlertidig passord må ha minst ${PASSORD_MINST} tegn`)
  }
  const tegn = [tilfeldigTegn(SMAA), tilfeldigTegn(STORE), tilfeldigTegn(TALL)]
  while (tegn.length < lengde) tegn.push(tilfeldigTegn(ALLE))

  // Fisher–Yates, med den samme sikre kilden som tegnene selv.
  for (let i = tegn.length - 1; i > 0; i--) {
    const j = tilfeldigTall(i + 1)
    ;[tegn[i], tegn[j]] = [tegn[j] as string, tegn[i] as string]
  }
  return tegn.join('')
}
