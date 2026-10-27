/**
 * Fagsider som legges inn med en migrasjon uten faginnhold: bare navnet og
 * nøkkelen, publisert, og plassert i stoffregisteret. Det er det samme som
 * «Ny fagside» i stoffregisteret gjør (`Stoffregisterkilde.tsx`), men for
 * mange sider på én gang.
 *
 * Sidene er ikke faglig kuraterte, og får ikke monografiinnhold her. De viser
 * det OUSFAR henter selv (preparatene, når siden kobles til FEST med
 * `festkoblinger.ts`), og sier at de ikke har faginnhold
 * (`harFaginnhold` i `stoffside.ts`). Kurateringsstatusen deres er «Ikke
 * kuratert» til en kuratering er publisert (`docs/kurateringsgrener.md`).
 *
 * Modulen brukes av skriptet som lager migrasjonen og av testene, ikke av
 * appen.
 */
import { stoffslug } from '../domain/stoffregister'
import { VERKTOY_FAGSIDER, VERKTOY_FAGSIDEKILDE } from '../verktoy/fagsider'
import { innlogging, lit } from './import'

export interface Nyfagside {
  /** Navnet siden får; nøkkelen lages av det (`stoffslug`). */
  navn: string
  /** Kategorien i stoffregisteret, og eventuelt underkategorien, som lages om den mangler. */
  kategori: readonly [string] | readonly [string, string]
}

/** Hver import av nye fagsider, i rekkefølge, med navnet migrasjonen fikk og kilden revisjonene får. */
export const FAGSIDEIMPORTER: readonly { migrasjon: string; kilde: string; sider: readonly Nyfagside[] }[] = [
  { migrasjon: 'verktoy_fagsider', kilde: VERKTOY_FAGSIDEKILDE, sider: VERKTOY_FAGSIDER },
]

/**
 * SQL-en som lager sidene, som administratoren `admin`: hver side publisert,
 * og lagt i kategorien sin. Den hopper over — med en melding — en side som
 * alt finnes med samme navn eller nøkkel (også som utkast, arkivert eller i
 * papirkurven), og en nøkkel som er slettet for godt, så den aldri lager en
 * side to ganger og kan kjøres igjen uten å gjøre noe. Finnes ikke
 * kategorien, står siden under «Andre stoffer». Uten administratoren gjør den
 * ingenting, som i testdatabasen.
 */
export function nyeFagsiderSql(sider: readonly Nyfagside[], admin: string, kilde: string): string {
  const rader = sider
    .map(({ navn, kategori: [kategori, under] }) => `      (${lit(navn)}, ${lit(stoffslug(navn))}, ${lit(kategori)}, ${under ? lit(under) : 'null'})`)
    .join(',\n')
  return `-- Nye fagsider uten faginnhold
do $fagsider$
declare
  administrator uuid;
  s record;
  status public.objektstatus;
  forelder uuid;
  kategori uuid;
begin
${innlogging(admin, 'hopp over')}
  perform set_config('far.revisjonskilde', ${lit(kilde)}, true);

  for s in
    select * from (values
${rader}
    ) as t(navn, slug, kategori, underkategori)
  loop
    if exists (select 1 from public.infosider i where lower(i.navn) = lower(s.navn) or i.slug = s.slug) then
      raise notice '% finnes alt som fagside, så den lages ikke på nytt.', s.navn;
      continue;
    end if;
    if exists (select 1 from public.stoffstatus x where x.stoff = s.slug) then
      raise notice '% er slettet for godt, så den lages ikke på nytt.', s.navn;
      continue;
    end if;

    status := public.opprett_utkast('infoside', jsonb_build_object('navn', s.navn, 'slug', s.slug));
    perform public.publiser_utkast(status.id, status.revisjon);

    forelder := (
      select k.id from public.stoffkategorier k
      where k.forelder_id is null and k.navn = s.kategori and k.arkivert_kl is null
    );
    if forelder is null then
      raise notice 'Fant ingen kategori %, så % står under «Andre stoffer».', s.kategori, s.navn;
      continue;
    end if;
    kategori := forelder;
    if s.underkategori is not null then
      kategori := (
        select k.id from public.stoffkategorier k
        where k.forelder_id = forelder and k.navn = s.underkategori and k.arkivert_kl is null
      );
      if kategori is null then
        kategori := public.opprett_stoffkategori(s.underkategori, forelder);
      end if;
    end if;
    perform public.plasser_stoff(s.slug, null, kategori);
  end loop;
end
$fagsider$;`
}
