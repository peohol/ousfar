import { can } from '@delt/personal/permissions'
import { useMemo } from 'react'
import { Button } from '../../components/Button'
import { Ikon } from '../../components/ikon/Ikon'
import { Merke } from '../../components/Merke'
import { useBevart } from '../../oppdatering/Bevaring'
import type { Faneinnhold } from '../faner'
import { iFanen, erNy, kvalifisertI, lesMedarbeidergrunnlag, vaktandelI } from './modell'
import { Personredigering } from './Personredigering'
import { Vaktplanansvarlige } from './Vaktplanansvarlige'

/**
 * Medarbeidere-fanen (P2c, docs/personal.md §7.4 og §8.5, K-MED-1–5): én
 * tabell over alle som er med i kalenderen fremover. I et vanlig fagmiljø er
 * det nøyaktig de aktive medlemmene, med navnet og stillingen fra profilen;
 * ingen legges inn her. Nye står øverst, merket «Ny», til vaktene er valgt.
 * Kvalifikasjonene og vaktandelen endres fra i dag (K-MED-2), og den lokale
 * administratoren velger de vaktplanansvarlige under tabellen.
 */
export function Medarbeidere({ fagmiljo, grunnlag, hentPaNytt }: Faneinnhold) {
  const g = useMemo(() => lesMedarbeidergrunnlag(grunnlag), [grunnlag])
  const folk = iFanen(g)
  // Den som redigeres, overlever en oppdatering av appen.
  const [redigerer, setRedigerer] = useBevart<string | null>(`personal-medarbeider-${fagmiljo.id}`, null)
  const valgt = folk.find((m) => m.id === redigerer) ?? null
  const stilling = (id: string | null) => (id ? g.stillinger.find((s) => s.id === id)?.name : undefined)

  return (
    <div className="gruppeside__del personalmedarbeidere">
      <p className="gruppeside__ingress">
        Medarbeiderne er medlemmene i fagmiljøet, med navnet og stillingen fra profilen. Her velges hvilke vakter hver kan ta, og vaktandelen. Endringene gjelder fra i dag.
      </p>
      {folk.length === 0 ? (
        <p className="personaltomt">Ingen medarbeidere ennå.</p>
      ) : (
        <div className="personaltabell__ramme">
          <table className="personaltabell">
            <thead>
              <tr>
                <th scope="col">Medarbeider</th>
                <th scope="col">Stilling</th>
                {g.oppgaver.map((s) => (
                  <th key={s.id} scope="col" className="personaltabell__midt">
                    {s.name}
                  </th>
                ))}
                <th scope="col" className="personaltabell__tall">
                  Vaktandel
                </th>
                <th scope="col">
                  <span className="kun-skjermleser">Endre</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {folk.map((m) => {
                const ny = erNy(m)
                const kan = kvalifisertI(m, g.iDag)
                const andel = vaktandelI(m, g.iDag)
                const navn = stilling(m.stilling)
                return (
                  <tr key={m.id} className={ny ? 'personaltabell__ny' : undefined}>
                    <th scope="row">
                      <span className="personaltabell__person">
                        {m.navn}
                        {ny && <Merke>Ny</Merke>}
                      </span>
                    </th>
                    <td>{navn ?? <span className="personaltabell__mangler">Mangler stilling</span>}</td>
                    {g.oppgaver.map((s) => (
                      <td key={s.id} className="personaltabell__midt">
                        {kan.includes(s.id) ? (
                          <Ikon navn="yes" etikett="Ja" />
                        ) : (
                          <span className="personaltabell__dempet">
                            <span aria-hidden="true">–</span>
                            <span className="kun-skjermleser">Nei</span>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="personaltabell__tall">{andel === 100 ? <span className="personaltabell__dempet">100 %</span> : <strong>{andel} %</strong>}</td>
                    <td className="personaltabell__hoyre">
                      <Button variant={ny ? 'sekundar' : 'kant'} icon={ny ? undefined : <Ikon navn="edit" />} onClick={() => setRedigerer(m.id)} aria-label={`${ny ? 'Velg vakter for' : 'Endre'} ${m.navn}`}>
                        {ny ? 'Velg vakter' : 'Endre'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {valgt && (
        <Personredigering
          key={valgt.id}
          fagmiljo={fagmiljo.id}
          medarbeider={valgt}
          stilling={stilling(valgt.stilling)}
          grunnlag={g}
          onEndret={hentPaNytt}
          onLukk={() => setRedigerer(null)}
        />
      )}
      {can(g.rolle, 'managePlanners') && <Vaktplanansvarlige fagmiljo={fagmiljo.id} onEndret={hentPaNytt} />}
    </div>
  )
}
