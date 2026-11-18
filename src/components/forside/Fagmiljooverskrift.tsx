import { useFagmiljobytte } from '../konto/useFagmiljobytte'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'

/**
 * Forsidens tittel: navnet på fagmiljøet brukeren arbeider i, og en rund pil
 * med de samme valgene som «Fagmiljø» i kontomenyen (planen §4.5, skisse 04).
 * Med bare ett valg står pilen ikke der. En systemarkitekt ser fagmiljøene hen
 * ikke er medlem av, merket «Ikke medlem»; valget gjør hen ikke til medlem.
 */
export function Fagmiljooverskrift() {
  const { gjeldende, velgbare, kanVelge, erMedlem, bytter, feil, bytt } = useFagmiljobytte()

  return (
    <div className="forside__overskrift">
      <h1 className="forside__tittel">{gjeldende?.navn ?? 'OUSFAR'}</h1>
      {kanVelge && (
        <Nedtrekksmeny
          className="forside__fagmiljovalg"
          etikett="Bytt fagmiljø"
          lag="fagmiljovalg"
          knapp={{ ikon: 'chev', etikett: 'Bytt fagmiljø', variant: 'kant', storrelse: 'liten', className: 'forside__fagmiljopil' }}
        >
          {(lukk) => (
            <>
              <ul className="nedtrekk__valg" aria-label="Fagmiljøet du arbeider i">
                {velgbare.map((f) => (
                  <li key={f.id}>
                    <Menyvalg
                      ikon={f.id === gjeldende?.id ? 'done' : f.ikon}
                      tekst={f.navn}
                      aktiv={f.id === gjeldende?.id}
                      hint={bytter === f.id ? 'Bytter …' : erMedlem(f) ? undefined : 'Ikke medlem'}
                      onClick={() => void bytt(f).then((byttet) => byttet && lukk())}
                    />
                  </li>
                ))}
              </ul>
              {feil && (
                <p className="skjemafeil forside__fagmiljofeil" role="alert">
                  Fagmiljøet ble ikke byttet. Prøv igjen.
                </p>
              )}
              <p className="forside__fagmiljomerknad">Fortolkningen følger fagmiljøet. Fagsidene og gruppene dine er de samme.</p>
            </>
          )}
        </Nedtrekksmeny>
      )}
    </div>
  )
}
