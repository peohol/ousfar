import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { klient } from '../../auth/klient'
import { tidspunkt } from '../../faginnhold/historikk'
import { useBevart } from '../../oppdatering/Bevaring'
import { VERKTOY } from '../../verktoy/register'
import { erKliniskGodkjent } from '../../verktoy/regler/godkjenning'
import { lagVerktoysperrelager, OMFANGSTEKST, type Sperrehistorikk, type Sperreomfang, type Verktoysperrelager } from '../../verktoy/sperrer'
import { REGELSETT } from '../../verktoy/tilgjengelighet'
import { Button } from '../Button'
import { Modallag } from '../Modallag'
import { Felt } from './Felt'

/** Sperren som fylles ut. */
interface Utkast {
  omfang: Sperreomfang
  mal: string
  grunn: string
}

const TOMT: Utkast = { omfang: 'verktoy', mal: '', grunn: '' }

/** Hvor mange opphevede sperrer historikken viser; de nyeste først. */
const MAKS_HISTORIKK = 20

/** Reglene som kan gi klinisk innhold, og derfor er de som kan trenge en sperre. */
const KLINISKE_REGLER = REGELSETT.regler.filter(erKliniskGodkjent)

const malnavn = (s: Pick<Sperrehistorikk, 'omfang' | 'mal'>) =>
  s.omfang === 'alle'
    ? OMFANGSTEKST.alle
    : s.omfang === 'verktoy'
      ? `${OMFANGSTEKST.verktoy} «${VERKTOY.find((v) => v.id === s.mal)?.navn ?? s.mal}»`
      : `${OMFANGSTEKST.regel} «${REGELSETT.regler.find((r) => r.id === s.mal)?.tittel ?? s.mal}»`

/**
 * Nødstoppen for de kliniske verktøyene, for administratorer (P11.6,
 * `docs/verktøy-p11-publisering.md`): deaktiver alle verktøyene, ett verktøy
 * eller én regel med en gang, uten en ny versjon av appen, og opphev sperren
 * når feilen er rettet og kontrollert. Hver sperre og hver oppheving har en
 * grunn og står i historikken. Tilgangen avgjøres i databasen; dette er bare
 * visningen.
 */
export function Verktoysperrer({ apen, onLukk, lager: egetLager }: { apen: boolean; onLukk: () => void; lager?: Verktoysperrelager }) {
  const lager = useMemo(() => egetLager ?? (apen ? lagVerktoysperrelager(klient()) : null), [apen, egetLager])
  const [historikk, setHistorikk] = useState<Sperrehistorikk[] | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  // Sperren og grunnene som skrives, overlever en oppdatering av appen.
  const [utkast, setUtkast] = useBevart<Utkast>('verktoysperre', TOMT)
  const [opphev, setOpphev] = useBevart<Record<string, string>>('verktoysperre-opphev', {})

  const les = useCallback(async () => {
    if (!lager) return
    try {
      setHistorikk(await lager.historikk())
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet sperrene.')
    }
  }, [lager])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    void les()
  }, [apen, les])

  const utfor = async (endring: () => Promise<unknown>): Promise<boolean> => {
    if (!lager || arbeider) return false
    setArbeider(true)
    setFeil(null)
    try {
      await endring()
      return true
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
      return false
    } finally {
      await les()
      setArbeider(false)
    }
  }

  const sett = async (h: FormEvent) => {
    h.preventDefault()
    if (!lager) return
    if (utkast.omfang !== 'alle' && !utkast.mal) return setFeil(`Velg ${utkast.omfang === 'verktoy' ? 'verktøyet' : 'regelen'} som skal deaktiveres.`)
    if (utkast.grunn.trim().length < 5) return setFeil('Skriv grunnen til sperren, minst fem tegn.')
    if (await utfor(() => lager.sett(utkast.omfang, utkast.omfang === 'alle' ? null : utkast.mal, utkast.grunn))) setUtkast(TOMT)
  }

  const opphevSperre = async (id: string) => {
    if (!lager) return
    const grunn = opphev[id] ?? ''
    if (grunn.trim().length < 5) return setFeil('Skriv hvorfor sperren kan oppheves, minst fem tegn.')
    if (await utfor(() => lager.opphev(id, grunn))) setOpphev(({ [id]: _, ...resten }) => resten)
  }

  const aktive = historikk?.filter((s) => !s.opphevet_kl) ?? []
  const opphevede = historikk?.filter((s) => s.opphevet_kl).slice(0, MAKS_HISTORIKK) ?? []
  const id = useId()

  return (
    <Modallag apen={apen} tittel="Kliniske verktøy" ikon="shield" bred onLukk={onLukk}>
      <p className="autoerstatt__ingress">
        Nødstopp ved en kritisk feil: en sperre virker med en gang for alle brukere, uten en ny versjon av appen. Verktøyet viser da verken doseplan eller fagtekst, bare at det
        er midlertidig deaktivert og hvorfor. Opphev sperren først når feilen er rettet og kontrollert. Fremgangsmåten står i docs/verktøy-p11-publisering.md.
      </p>

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      <section aria-labelledby={`${id}-aktive`} className="verktoysperrer__del">
        <h3 id={`${id}-aktive`}>Aktive sperrer</h3>
        {historikk === null ? (
          <p className="autoerstatt__tomt">Henter sperrene …</p>
        ) : aktive.length === 0 ? (
          <p className="autoerstatt__tomt">Ingen sperrer. Verktøyene er tilgjengelige.</p>
        ) : (
          <ul className="autoerstatt__liste">
            {aktive.map((s) => (
              <li key={s.id} className="autoerstatt__rad autoerstatt__rad--skjema">
                <p className="verktoysperrer__mal">{malnavn(s)}</p>
                <p className="verktoysperrer__grunn">{s.grunn}</p>
                <p className="felt__hjelp">
                  Satt {tidspunkt(s.satt_kl)}
                  {s.satt_av && ` av ${s.satt_av}`}
                </p>
                <div className="autoerstatt__felter">
                  <Felt
                    merkelapp="Hvorfor kan sperren oppheves?"
                    value={opphev[s.id] ?? ''}
                    onChange={(e) => setOpphev((o) => ({ ...o, [s.id]: e.target.value }))}
                    maxLength={500}
                  />
                </div>
                <div className="autoerstatt__knapper">
                  <Button variant="kant" disabled={arbeider} onClick={() => void opphevSperre(s.id)}>
                    Opphev sperren
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="verktoysperrer__del" aria-labelledby={`${id}-ny`} onSubmit={(h) => void sett(h)}>
        <h3 id={`${id}-ny`}>Ny sperre</h3>
        <fieldset className="verktoysperrer__omfang">
          <legend className="felt__merkelapp">Hva skal deaktiveres?</legend>
          {(['alle', 'verktoy', 'regel'] as const).map((o) => (
            <label key={o} className="avkryssing">
              <input type="radio" name={`${id}-omfang`} checked={utkast.omfang === o} onChange={() => setUtkast({ ...utkast, omfang: o, mal: '' })} />
              {o === 'alle' ? 'Alle verktøyene' : o === 'verktoy' ? 'Ett verktøy' : 'Én klinisk godkjent regel'}
            </label>
          ))}
        </fieldset>
        {utkast.omfang !== 'alle' && (
          <label className="felt">
            <span className="felt__merkelapp">{utkast.omfang === 'verktoy' ? 'Verktøyet' : 'Regelen'}</span>
            <select className="felt__inndata" value={utkast.mal} onChange={(e) => setUtkast({ ...utkast, mal: e.target.value })}>
              <option value="">Velg …</option>
              {(utkast.omfang === 'verktoy' ? VERKTOY.map((v) => ({ id: v.id, navn: v.navn })) : KLINISKE_REGLER.map((r) => ({ id: r.id, navn: `${r.tittel} (versjon ${r.versjon})` }))).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.navn}
                </option>
              ))}
            </select>
          </label>
        )}
        <Felt merkelapp="Grunn" hjelp="Vises for alle brukere av verktøyet." value={utkast.grunn} onChange={(e) => setUtkast({ ...utkast, grunn: e.target.value })} maxLength={500} />
        <div className="autoerstatt__knapper">
          <Button type="submit" disabled={arbeider}>
            Deaktiver nå
          </Button>
        </div>
      </form>

      {opphevede.length > 0 && (
        <section aria-labelledby={`${id}-historikk`} className="verktoysperrer__del">
          <h3 id={`${id}-historikk`}>Opphevede sperrer</h3>
          <ul className="autoerstatt__liste">
            {opphevede.map((s) => (
              <li key={s.id} className="autoerstatt__rad autoerstatt__rad--skjema">
                <p className="verktoysperrer__mal">{malnavn(s)}</p>
                <p className="verktoysperrer__grunn">{s.grunn}</p>
                <p className="felt__hjelp">
                  Satt {tidspunkt(s.satt_kl)}
                  {s.satt_av && ` av ${s.satt_av}`}. Opphevet {tidspunkt(s.opphevet_kl!)}
                  {s.opphevet_av && ` av ${s.opphevet_av}`}: {s.opphevet_grunn}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Modallag>
  )
}
