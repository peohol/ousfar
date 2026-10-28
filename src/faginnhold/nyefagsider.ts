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

export interface Fagsideimport {
  /** Navnet migrasjonen fikk (`<tidspunkt>_<migrasjon>.sql`). */
  migrasjon: string
  /** Kilden revisjonene får i historikken. */
  kilde: string
  sider: readonly Nyfagside[]
  /**
   * Står stoffet alt i en kategori i stoffregisteret, beholder det
   * plasseringen sin og legges ikke i kategorien her. For stoffer som står i
   * stoffregisterfilen og har fått plass i grunninndelingen
   * (`stoffregister_redigering`), så en flytting som er gjort siden, står.
   */
  beholdPlassering?: boolean
}

/**
 * Kokain, MDMA og etanol står i stoffregisterfilen, med aliasene og
 * analyttene sine, og i kategoriene sine fra grunninndelingen, men hadde ingen
 * fagside, så kurateringen av dem ikke kunne starte. Kategoriene er de samme
 * som i grunninndelingen: kokain og MDMA under «Stimulanter» med amfetamin, og
 * etanol under «Alkohol og GHB» med GHB.
 */
export const KOKAIN_MDMA_ETANOL_FAGSIDER: readonly Nyfagside[] = [
  { navn: 'Kokain', kategori: ['Stimulanter'] },
  { navn: 'MDMA', kategori: ['Stimulanter'] },
  { navn: 'Etanol', kategori: ['Alkohol og GHB'] },
]

/** Kilden revisjonene av sidene over får i historikken. */
export const KOKAIN_MDMA_ETANOL_FAGSIDEKILDE = 'Ny fagside uten faginnhold, til kuratering'

/** Hver import av nye fagsider, i rekkefølge. */
export const FAGSIDEIMPORTER: readonly Fagsideimport[] = [
  { migrasjon: 'verktoy_fagsider', kilde: VERKTOY_FAGSIDEKILDE, sider: VERKTOY_FAGSIDER },
  {
    migrasjon: 'kokain_mdma_etanol_fagsider',
    kilde: KOKAIN_MDMA_ETANOL_FAGSIDEKILDE,
    sider: KOKAIN_MDMA_ETANOL_FAGSIDER,
    beholdPlassering: true,
  },
]

/**
 * SQL-en som lager sidene, som administratoren `admin`: hver side publisert,
 * og lagt i kategorien sin. Den hopper over — med en melding — en side som
 * alt finnes med samme navn eller nøkkel (også som utkast, arkivert eller i
 * papirkurven), og en nøkkel som er slettet for godt, så den aldri lager en
 * side to ganger og kan kjøres igjen uten å gjøre noe. Finnes ikke
 * kategorien, står siden under «Andre stoffer». Med `beholdPlassering` får et
 * stoff som alt står i en kategori, ingen ny plassering. Uten administratoren
 * gjør den ingenting, som i testdatabasen.
 */
export function nyeFagsiderSql(
  sider: readonly Nyfagside[],
  admin: string,
  kilde: string,
  { beholdPlassering = false }: Pick<Fagsideimport, 'beholdPlassering'> = {},
): string {
  const rader = sider
    .map(({ navn, kategori: [kategori, under] }) => `      (${lit(navn)}, ${lit(stoffslug(navn))}, ${lit(kategori)}, ${under ? lit(under) : 'null'})`)
    .join(',\n')
  const plassert = beholdPlassering
    ? `
    if exists (
      select 1 from public.stoffplasseringer p
      join public.stoffkategorier k on k.id = p.kategori_id
      where p.stoff = s.slug and k.arkivert_kl is null
    ) then
      raise notice '% står alt i stoffregisteret, så plasseringen står som den er.', s.navn;
      continue;
    end if;`
    : ''
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
${plassert}
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
