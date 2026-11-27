import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { klient } from '../../auth/klient'
import {
  kanEndreTestmiljo,
  lagFunksjonsbryterlager,
  MINSTE_BEGRUNNELSE,
  TILSTANDER,
  tilstandI,
  tillatteTilstander,
  type Funksjonsbryterlager,
  type Funksjonsoversikt,
  type Funksjonstilstand,
} from '../../auth/funksjonsbrytere'
import { useOppdaterRettigheter } from '../../auth/rettigheter'
import { tidspunkt } from '../../faginnhold/historikk'
import { useBevart } from '../../oppdatering/Bevaring'
import { Modallag } from '../Modallag'
import { Felt } from './Felt'

/**
 * Funksjonsbryterne per fagmiljø og testmiljøene, for systemarkitektene (#598,
 * docs/fagmiljoer.md, «Funksjonsbrytere per fagmiljø»). En funksjon som et
 * prosjekt har ført inn, kan stå av, til utprøving (bare systemarkitekter som
 * selv er medlemmer av fagmiljøet) eller på (alle medlemmene). Hver endring
 * krever en begrunnelse og føres i tilgangsloggen. Databasen avgjør hva som er
 * lov; dette er bare visningen.
 */
export function Funksjoner({ apen, onLukk, lager: egetLager }: { apen: boolean; onLukk: () => void; lager?: Funksjonsbryterlager }) {
  const lager = useMemo(() => egetLager ?? (apen ? lagFunksjonsbryterlager(klient()) : null), [apen, egetLager])
  const oppdater = useOppdaterRettigheter()
  const [oversikt, setOversikt] = useState<Funksjonsoversikt | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  // Begrunnelsen som skrives, overlever en oppdatering av appen.
  const [begrunnelse, setBegrunnelse] = useBevart('funksjonsbryter-begrunnelse', '')
  const id = useId()

  const les = useCallback(async () => {
    if (!lager) return
    try {
      setOversikt(await lager.oversikt())
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet funksjonene.')
    }
  }, [lager])

  useEffect(() => {
    if (!apen) return
    setFeil(null)
    void les()
  }, [apen, les])

  const utfor = async (endring: (lager: Funksjonsbryterlager, grunn: string) => Promise<unknown>) => {
    if (!lager || arbeider) return
    if (begrunnelse.trim().length < MINSTE_BEGRUNNELSE) return setFeil(`Skriv begrunnelsen for endringen først, minst ${MINSTE_BEGRUNNELSE} tegn.`)
    setArbeider(true)
    setFeil(null)
    try {
      await endring(lager, begrunnelse)
      setBegrunnelse('')
      // Det den innloggede selv har, kan ha endret seg.
      oppdater()
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      await les()
      setArbeider(false)
    }
  }

  const fagmiljoer = oversikt?.fagmiljoer ?? []
  return (
    <Modallag apen={apen} tittel="Funksjoner" ikon="gears" bred onLukk={onLukk}>
      <p className="autoerstatt__ingress">
        Funksjoner som bygges inn trinnvis, slås av og på her for hvert fagmiljø, uten en ny versjon av appen. Utprøving gir funksjonen bare til systemarkitekter som selv er
        medlemmer av fagmiljøet; på gir den til alle medlemmene. Den som ikke har funksjonen, ser ingenting av den. Så lenge en funksjon bare er godkjent for testmiljøer, kan
        den bare prøves ut eller slås på der. Hver endring føres i tilgangsloggen med begrunnelsen.
      </p>

      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      <Felt
        merkelapp="Begrunnelse for endringen"
        hjelp="Kreves for hver endring under, og føres i tilgangsloggen."
        value={begrunnelse}
        onChange={(e) => setBegrunnelse(e.target.value)}
        maxLength={500}
      />

      {oversikt === null ? (
        <p className="autoerstatt__tomt">Henter funksjonene …</p>
      ) : (
        <>
          <section aria-labelledby={`${id}-funksjoner`} className="verktoysperrer__del">
            <h3 id={`${id}-funksjoner`}>Funksjonene</h3>
            {oversikt.funksjoner.length === 0 ? (
              <p className="autoerstatt__tomt">Ingen funksjoner er ført inn ennå.</p>
            ) : (
              <ul className="autoerstatt__liste">
                {oversikt.funksjoner.map((f) => (
                  <li key={f.nokkel} className="autoerstatt__rad autoerstatt__rad--skjema">
                    <p className="verktoysperrer__mal">{f.navn}</p>
                    <p className="verktoysperrer__grunn">{f.beskrivelse}</p>
                    <p className="felt__hjelp">{f.virkeligeFagmiljoer ? 'Godkjent for alle fagmiljøer.' : 'Bare godkjent for testmiljøer.'}</p>
                    {fagmiljoer.map((m) => {
                      const tilstand = tilstandI(f, m.id)
                      const tillatt = tillatteTilstander(f, m)
                      const bryter = f.brytere.find((b) => b.fagmiljo === m.id)
                      return (
                        <label key={m.id} className="felt">
                          <span className="felt__merkelapp">
                            {m.navn}
                            {m.testmiljo && ' (testmiljø)'}
                          </span>
                          <select
                            aria-label={`${f.navn} i ${m.navn}${m.testmiljo ? ' (testmiljø)' : ''}`}
                            className="felt__inndata"
                            value={tilstand}
                            disabled={arbeider || tillatt.length < 2}
                            onChange={(e) =>
                              void utfor((l, grunn) => l.settBryter(f.nokkel, m.id, e.target.value as Funksjonstilstand, grunn))
                            }
                          >
                            {tillatt.map((t) => (
                              <option key={t} value={t}>
                                {TILSTANDER[t].navn}: {TILSTANDER[t].hvem.toLowerCase()}
                              </option>
                            ))}
                          </select>
                          {bryter && (
                            <span className="felt__hjelp">
                              Endret {tidspunkt(bryter.endretKl)}
                              {bryter.endretAv && ` av ${bryter.endretAv}`}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby={`${id}-testmiljo`} className="verktoysperrer__del">
            <h3 id={`${id}-testmiljo`}>Testmiljøer</h3>
            <p className="felt__hjelp">
              Et testmiljø er et fagmiljø for utprøving med oppdiktede data, som Sandkasse. Standardfagmiljøet kan ikke være et testmiljø, og merket kan ikke fjernes mens en
              funksjon som bare er godkjent for testmiljøer, prøves ut eller er på der.
            </p>
            <ul className="autoerstatt__liste">
              {fagmiljoer.map((m) => (
                <li key={m.id}>
                  <label className="avkryssing">
                    <input
                      type="checkbox"
                      checked={m.testmiljo}
                      disabled={arbeider || !kanEndreTestmiljo(oversikt, m)}
                      onChange={(e) => void utfor((l, grunn) => l.settTestmiljo(m.id, e.target.checked, grunn))}
                    />
                    {m.navn}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Modallag>
  )
}
