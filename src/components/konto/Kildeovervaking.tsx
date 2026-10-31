import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { klient } from '../../auth/klient'
import { tidspunkt } from '../../faginnhold/historikk'
import { kallMot } from '../../legemiddeldata/lager'
import { useBevart } from '../../oppdatering/Bevaring'
import { ARTTEKST, KILDETEKST } from '../../verktoy/overvaking/modell'
import {
  erApen,
  FRISTER,
  fristene,
  lagKildeovervakingslager,
  kontrollstatus,
  type Kildefunn,
  type Kildeovervaking as Overvaking,
  type Kildeovervakingslager,
} from '../../verktoy/overvaking/varsling'
import { REGELSETTENE } from '../../verktoy/tilgjengelighet'
import { Button } from '../Button'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'

/** Lageret appen bruker, mot databasen som den innloggede. */
export const kildeovervakingslager = (): Kildeovervakingslager => lagKildeovervakingslager(kallMot(klient()))

const REGLER = REGELSETTENE.flatMap((s) => s.regler)
const regelnavn = (id: string, versjon: number) => `${REGLER.find((r) => r.id === id)?.tittel ?? id} (versjon ${versjon})`

/** En tekst som skal skrives: minst fem tegn, som databasen krever. */
const forKort = (t: string | undefined) => (t ?? '').trim().length < 5

function Frister({ f, na }: { f: Kildefunn; na: number }) {
  const frist = fristene(f, na)
  return (
    <ul className="kildeovervaking__frister">
      {frist.teknisk !== 'gjort' && (
        <li className={frist.teknisk === 'over_fristen' ? 'kildeovervaking__over' : undefined}>
          Teknisk vurdering mangler{frist.teknisk === 'over_fristen' ? `, over fristen på ${FRISTER.teknisk} timer.` : ` (frist ${FRISTER.teknisk} timer etter funnet).`}
        </li>
      )}
      {f.prioritet === 'hoy' && (
        <li className={frist.faglig === 'over_fristen' ? 'kildeovervaking__over' : undefined}>
          Faglig beslutning mangler{frist.faglig === 'over_fristen' ? `, over fristen på ${FRISTER.faglig} timer. Kan en plan være uforsvarlig, sett en sperre under Kliniske verktøy.` : ` (frist ${FRISTER.faglig} timer etter funnet).`}
        </li>
      )}
    </ul>
  )
}

function Funnhode({ f }: { f: Kildefunn }) {
  return (
    <>
      <p className="verktoysperrer__mal">{f.etikett}</p>
      <p className="kildeovervaking__merker">
        {f.prove && <Merke tone="flate">Prøve</Merke>}
        {erApen(f) && <Merke tone={f.prioritet === 'hoy' ? 'alvorlig' : 'noytral'}>{f.prioritet === 'hoy' ? 'Høy prioritet' : 'Vanlig prioritet'}</Merke>}
        <span>
          {KILDETEKST[f.kilde]}, {ARTTEKST[f.art]}
        </span>
      </p>
    </>
  )
}

/**
 * Kildeovervåkingen for de kliniske verktøyene, for administratorer (P12.1,
 * `docs/verktøy-p12-overvaking.md` §5): funnene som krever ny faglig
 * vurdering, med fristene, den tekniske vurderingen og den faglige
 * beslutningen som avslutter dem, og hva siste kontroll sammenlignet. Ingenting
 * her endrer, godkjenner eller sperrer en regel. Tilgangen avgjøres i
 * databasen; dette er bare visningen.
 */
export function Kildeovervaking({ apen, onLukk, lager: egetLager, na = Date.now }: { apen: boolean; onLukk: () => void; lager?: Kildeovervakingslager; na?: () => number }) {
  const lager = useMemo(() => egetLager ?? (apen ? kildeovervakingslager() : null), [apen, egetLager])
  const [data, setData] = useState<Overvaking | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  // Vurderingene og beslutningene som skrives, overlever en oppdatering av appen.
  const [tekniske, setTekniske] = useBevart<Record<number, string>>('kildefunn-teknisk', {})
  const [beslutninger, setBeslutninger] = useBevart<Record<number, string>>('kildefunn-beslutning', {})

  const les = useCallback(async () => {
    if (!lager) return
    try {
      setData(await lager.les())
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet kildeovervåkingen.')
    }
  }, [lager])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    void les()
  }, [apen, les])

  const lagre = async (id: number, tekst: string | undefined, hva: 'vurder' | 'beslutt') => {
    if (!lager || arbeider) return
    if (forKort(tekst)) return setFeil(hva === 'vurder' ? 'Skriv den tekniske vurderingen, minst fem tegn.' : 'Skriv den faglige beslutningen, minst fem tegn.')
    setArbeider(true)
    setFeil(null)
    try {
      await lager[hva](id, tekst!)
      const fjern = ({ [id]: _, ...resten }: Record<number, string>) => resten
      if (hva === 'vurder') setTekniske(fjern)
      else setBeslutninger(fjern)
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      await les()
      setArbeider(false)
    }
  }

  const naa = na()
  const apne = data?.funn.filter(erApen) ?? []
  const avsluttede = data?.funn.filter((f) => !erApen(f)) ?? []
  const siste = data?.siste ?? null
  const status = data && kontrollstatus(data, naa)
  const id = useId()

  return (
    <Modallag apen={apen} tittel="Kildeovervåking" ikon="refs" bred onLukk={onLukk}>
      <p className="autoerstatt__ingress">
        Hver mandag kontrolleres kildedokumentene og preparatene i FEST som de klinisk godkjente reglene i verktøyene bygger på, og Psychiatrienet den første mandagen i
        måneden. Et funn som krever ny faglig vurdering, står her til den faglige beslutningen er skrevet. Overvåkingen endrer, godkjenner eller sperrer ingen regel. Kan en
        endring gjøre en plan uforsvarlig, sett en sperre under Kliniske verktøy. Fremgangsmåten står i docs/verktøy-p12-overvaking.md.
      </p>

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      <section aria-labelledby={`${id}-apne`} className="verktoysperrer__del">
        <h3 id={`${id}-apne`}>Venter på faglig beslutning</h3>
        {data === null ? (
          <p className="autoerstatt__tomt">Henter kildeovervåkingen …</p>
        ) : apne.length === 0 ? (
          <p className="autoerstatt__tomt">Ingen funn venter.</p>
        ) : (
          <ul className="autoerstatt__liste">
            {apne.map((f) => (
              <li key={f.id} className="autoerstatt__rad autoerstatt__rad--skjema">
                <Funnhode f={f} />
                <ul className="kildeovervaking__detaljer">
                  {f.detaljer.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
                {f.berorte.length > 0 && <p className="felt__hjelp">Kan berøre: {[...new Set(f.berorte.map((b) => regelnavn(b.regel, b.versjon)))].join(', ')}.</p>}
                <p className="felt__hjelp">
                  Funnet {tidspunkt(f.opprettet_kl)}
                  {f.erstatter !== null && ', med endret innhold siden et tidligere funn'}.{' '}
                  {f.borte_kl ? `Ikke funnet igjen i kontrollen ${tidspunkt(f.borte_kl)}; ta stilling til om det kan avsluttes.` : f.sist_sett_kl ? `Sist sett ${tidspunkt(f.sist_sett_kl)}.` : ''} Nøkkel: {f.funn}
                </p>
                <Frister f={f} na={naa} />
                {f.teknisk_vurdering ? (
                  <div className="kildeovervaking__vurdering">
                    <p className="felt__merkelapp">
                      Teknisk vurdering{f.teknisk_av && ` av ${f.teknisk_av}`}, {tidspunkt(f.teknisk_kl!)}
                    </p>
                    <p className="verktoysperrer__grunn">{f.teknisk_vurdering}</p>
                  </div>
                ) : (
                  <>
                    <label className="felt">
                      <span className="felt__merkelapp">Teknisk vurdering</span>
                      <textarea className="felt__inndata" rows={3} maxLength={5000} value={tekniske[f.id] ?? ''} onChange={(e) => setTekniske((t) => ({ ...t, [f.id]: e.target.value }))} />
                      <span className="felt__hjelp">Hva er endret, og hva betyr det for reglene? Claude kan skrive den når du ber om det.</span>
                    </label>
                    <div className="autoerstatt__knapper">
                      <Button variant="kant" disabled={arbeider} onClick={() => void lagre(f.id, tekniske[f.id], 'vurder')}>
                        Lagre teknisk vurdering
                      </Button>
                    </div>
                  </>
                )}
                <label className="felt">
                  <span className="felt__merkelapp">Faglig beslutning</span>
                  <textarea className="felt__inndata" rows={3} maxLength={5000} value={beslutninger[f.id] ?? ''} onChange={(e) => setBeslutninger((b) => ({ ...b, [f.id]: e.target.value }))} />
                  <span className="felt__hjelp">For eksempel at regelen står uendret, eller at en ny regelversjon skal lages. Beslutningen avslutter funnet.</span>
                </label>
                <div className="autoerstatt__knapper">
                  <Button disabled={arbeider} onClick={() => void lagre(f.id, beslutninger[f.id], 'beslutt')}>
                    Lagre beslutning og avslutt
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${id}-siste`} className="verktoysperrer__del">
        <h3 id={`${id}-siste`}>Siste kontroll</h3>
        {status && <p className="kildeovervaking__over">{status[0]!.toUpperCase() + status.slice(1)}.</p>}
        {siste && (
          <>
            <p className="felt__hjelp">
              Kjørt {tidspunkt(siste.kjort_kl)}
              {siste.utlost === 'manuell' ? ', startet for hånd' : ''}.{' '}
              {siste.lenke && (
                <a href={siste.lenke} target="_blank" rel="noreferrer">
                  Hele rapporten
                </a>
              )}
            </p>
            <ul className="kildeovervaking__detaljer">
              {siste.grunnlag.map((g) => (
                <li key={g.kilde}>
                  {KILDETEKST[g.kilde]}: {g.kjort ? `${g.kontrollert} kontrollert. ` : ''}
                  {g.beskrivelse}
                </li>
              ))}
              {siste.feil.map((t) => (
                <li key={t} className="kildeovervaking__over">
                  Ikke kontrollert: {t}
                </li>
              ))}
            </ul>
            <p className="felt__merkelapp">Informative endringer</p>
            {siste.informative.length === 0 ? (
              <p className="autoerstatt__tomt">Ingen.</p>
            ) : (
              <ul className="kildeovervaking__detaljer">
                {siste.informative.map((i) => (
                  <li key={i.id}>
                    {KILDETEKST[i.kilde]}: {i.etikett} ({ARTTEKST[i.art]})
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {avsluttede.length > 0 && (
        <section aria-labelledby={`${id}-avsluttede`} className="verktoysperrer__del">
          <h3 id={`${id}-avsluttede`}>Avsluttede funn</h3>
          <ul className="autoerstatt__liste">
            {avsluttede.map((f) => (
              <li key={f.id} className="autoerstatt__rad autoerstatt__rad--skjema">
                <Funnhode f={f} />
                {f.teknisk_vurdering && (
                  <p className="felt__hjelp">
                    Teknisk vurdering{f.teknisk_av && ` av ${f.teknisk_av}`}: {f.teknisk_vurdering}
                  </p>
                )}
                <p className="felt__hjelp">
                  {f.beslutning_kl
                    ? `Avsluttet ${tidspunkt(f.beslutning_kl)}${f.beslutning_av ? ` av ${f.beslutning_av}` : ''}: ${f.beslutning}`
                    : `Avløst ${tidspunkt(f.erstattet_kl!)} av et nyere funn med endret innhold.`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Modallag>
  )
}
