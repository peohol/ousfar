import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { klient } from '../../auth/klient'
import { tidspunkt } from '../../faginnhold/historikk'
import { kallMot } from '../../legemiddeldata/lager'
import { lagFagsaklager, type Fagsaklager } from '../../verktoy/overvaking/fagsak'
import { ARTTEKST, KILDETEKST } from '../../verktoy/overvaking/modell'
import {
  erApen,
  lagKildeovervakingslager,
  kontrollstatus,
  TILSTANDSTEKST,
  UTFALLSTEKST,
  type Kildefunn,
  type Kildeovervaking as Overvaking,
  type Kildeovervakingslager,
} from '../../verktoy/overvaking/varsling'
import { REGELSETTENE } from '../../verktoy/tilgjengelighet'
import { Button } from '../Button'
import { Details } from '../Details'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'
import { Fagsaker } from './Fagsaker'

/** Lageret appen bruker, mot databasen som den innloggede. */
export const kildeovervakingslager = (): Kildeovervakingslager => lagKildeovervakingslager(kallMot(klient()))

/** De faglige sakene for redaktøren, mot databasen som den innloggede. */
export const fagsaklager = (): Fagsaklager => lagFagsaklager(kallMot(klient()))

const REGLER = REGELSETTENE.flatMap((s) => s.regler)
const regelnavn = (id: string, versjon: number) => `${REGLER.find((r) => r.id === id)?.tittel ?? id} (versjon ${versjon})`

/** Agentens spor: ingen handling fra redaktøren. */
const TEKNISK_SPOR = new Set<Kildefunn['tilstand']>(['teknisk_utredning', 'uavklart', 'faglig_gjennomgang'])

function Funnhode({ f }: { f: Kildefunn }) {
  return (
    <>
      <p className="verktoysperrer__mal">{f.etikett}</p>
      <p className="kildeovervaking__merker">
        {f.prove && <Merke tone="flate">Prøve</Merke>}
        {f.alvor === 'sikkerhet' && erApen(f) && <Merke tone="alvorlig">Mulig sikkerhetsproblem</Merke>}
        <Merke tone="noytral">{TILSTANDSTEKST[f.tilstand]}</Merke>
        <span>
          {KILDETEKST[f.kilde]}, {ARTTEKST[f.art]}
        </span>
      </p>
    </>
  )
}

/** Det tekniske for kontrollører: detaljene, konklusjonen, tiltakene og hendelsene. Lukket som standard. */
function TekniskLogg({ f }: { f: Kildefunn }) {
  return (
    <details className="kildeovervaking__teknisk">
      <summary>Teknisk logg</summary>
      <ul className="kildeovervaking__detaljer">
        {f.detaljer.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
      {f.konklusjon_tekst && <p className="felt__hjelp">Teknisk konklusjon ({f.konklusjon}): {f.konklusjon_tekst}</p>}
      {f.teknisk_vurdering && <p className="felt__hjelp">Teknisk vurdering (før kildesakene){f.teknisk_av && ` av ${f.teknisk_av}`}: {f.teknisk_vurdering}</p>}
      {f.beslutning && <p className="felt__hjelp">Faglig beslutning (før kildesakene){f.beslutning_av && ` av ${f.beslutning_av}`}: {f.beslutning}</p>}
      <ul className="kildeovervaking__detaljer">
        {f.tiltak.map((t) => (
          <li key={`t${t.id}`}>
            Tiltak {t.art}{t.regel ? ` (${t.regel})` : ''}: {t.status}{t.bevis ? `. ${t.bevis}` : ''}
          </li>
        ))}
        {f.hendelser.map((h, i) => (
          <li key={`h${i}`}>
            {tidspunkt(h.kl)}: {h.art}
            {h.til && h.til !== h.fra ? ` → ${h.til}` : ''}
            {h.av ? ` (${h.av})` : ''}
          </li>
        ))}
      </ul>
      <p className="felt__hjelp">
        Sak nr. {f.id}, versjon {f.versjon} ({f.funn})
      </p>
    </details>
  )
}

/**
 * Det tekniske sporet i kildeovervåkingen, for kontrollører: alle åpne saker,
 * også de agenten undersøker, med den lukkede tekniske loggen, og hva siste
 * kontroll sammenlignet. Redaktøren skal ikke gjøre noe her; det står lukket
 * under de faglige sakene. Ingenting her endrer, godkjenner eller sperrer en
 * regel.
 */
function TekniskSpor({ apen, lager: egetLager, na }: { apen: boolean; lager?: Kildeovervakingslager; na: () => number }) {
  const lager = useMemo(() => egetLager ?? (apen ? kildeovervakingslager() : null), [apen, egetLager])
  const [data, setData] = useState<Overvaking | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  // Siste lesing feilet: da er det ukjent om saker venter, og det skal ikke se ut som «ingen saker».
  const [ulest, setUlest] = useState(false)

  const les = useCallback(async () => {
    if (!lager) return
    try {
      setData(await lager.les())
      setUlest(false)
    } catch (e) {
      setUlest(true)
      setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet kildeovervåkingen.')
    }
  }, [lager])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    void les()
  }, [apen, les])

  const naa = na()
  const apne = data?.funn.filter(erApen) ?? []
  const avsluttede = data?.funn.filter((f) => !erApen(f)) ?? []
  const siste = data?.siste ?? null
  const status = data && kontrollstatus(data, naa)
  const id = useId()

  return (
    <>
      <p className="felt__hjelp">
        For kontrollører. Hver mandag kontrolleres kildene og preparatene i FEST som de klinisk godkjente reglene bygger på. Et funn undersøkes først teknisk; en endret
        kontrollsum alene blir aldri en faglig sak.
      </p>

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      {ulest && (
        <div className="kildeovervaking__ulest">
          <p className="kildeovervaking__over">
            {data ? 'Kildeovervåkingen kunne ikke leses på nytt, så det som vises, kan være utdatert.' : 'Kildeovervåkingen kunne ikke leses, så det er ukjent om saker venter.'}
          </p>
          <Button
            variant="kant"
            onClick={() => {
              setFeil(null)
              void les()
            }}
          >
            Prøv igjen
          </Button>
        </div>
      )}

      <section aria-labelledby={`${id}-apne`} className="verktoysperrer__del">
        <h4 id={`${id}-apne`}>Alle åpne saker, også tekniske</h4>
        {data === null ? (
          ulest ? null : <p className="autoerstatt__tomt">Henter kildeovervåkingen …</p>
        ) : apne.length === 0 ? (
          <p className="autoerstatt__tomt">Ingen åpne saker.</p>
        ) : (
          <ul className="autoerstatt__liste">
            {apne.map((f) => (
              <li key={f.id} className="autoerstatt__rad autoerstatt__rad--skjema">
                <Funnhode f={f} />
                {f.berorte.length > 0 && <p className="felt__hjelp">Kan berøre: {[...new Set(f.berorte.map((b) => regelnavn(b.regel, b.versjon)))].join(', ')}.</p>}
                <p className="felt__hjelp">
                  Funnet {tidspunkt(f.opprettet_kl)}.{' '}
                  {TEKNISK_SPOR.has(f.tilstand) && f.alvor !== 'sikkerhet' ? 'Følges opp teknisk; ingen handling fra deg.' : ''}
                  {f.borte_kl ? ` Ikke funnet igjen i kontrollen ${tidspunkt(f.borte_kl)}.` : ''}
                </p>
                <TekniskLogg f={f} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${id}-siste`} className="verktoysperrer__del">
        <h4 id={`${id}-siste`}>Siste kontroll</h4>
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
          <h4 id={`${id}-avsluttede`}>Avsluttede saker</h4>
          <ul className="autoerstatt__liste">
            {avsluttede.map((f) => (
              <li key={f.id} className="autoerstatt__rad autoerstatt__rad--skjema">
                <Funnhode f={f} />
                <p className="felt__hjelp">
                  Avsluttet {tidspunkt(f.avsluttet_kl!)}: {f.utfall ? UTFALLSTEKST[f.utfall] : 'avsluttet'}.
                </p>
                <TekniskLogg f={f} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/**
 * Vinduet «Kildeovervåking» i administrasjonsmenyen
 * (`docs/verktøy-omlegging-2026-11.md` §4, VDR-2): de faglige sakene først,
 * slik redaktøren skal se dem, og det tekniske sporet lukket under. Tilgangen
 * avgjøres i databasen; dette er bare visningen.
 */
export function Kildeovervaking({
  apen,
  onLukk,
  lager,
  fagsaker,
  onNodstopp,
  na = Date.now,
}: {
  apen: boolean
  onLukk: () => void
  lager?: Kildeovervakingslager
  fagsaker?: Fagsaklager
  onNodstopp?: () => void
  na?: () => number
}) {
  const saklager = useMemo(() => fagsaker ?? (apen ? fagsaklager() : null), [apen, fagsaker])
  return (
    <Modallag apen={apen} tittel="Kildeovervåking" ikon="refs" bred onLukk={onLukk}>
      <Fagsaker apen={apen} lager={saklager} onNodstopp={onNodstopp} />
      <section aria-label="Teknisk spor" className="verktoysperrer__del">
        <Details summary="Teknisk spor for kontrollører">
          <TekniskSpor apen={apen} lager={lager} na={na} />
        </Details>
      </section>
    </Modallag>
  )
}
