/**
 * Forbindelsene analyttkodene til OUS Klinisk farmakologi måler og datakortene
 * de bruker, og de felles datakortene koblet til forbindelsen i stedet for
 * koden (#395 punkt 3, docs/fagmiljoer.md, «Analyttkatalogen per fagmiljø»).
 *
 * Grunnlaget er `src/data/analyttforbindelser.json` (gjennom
 * `OUS_ANALYTTFORBINDELSER` i `src/domain/ouskatalog.ts`). Migrasjonen
 * (`*_analyttforbindelser_ous.sql`) er laget med
 * `analyttforbindelserSql('peohol', <filnavnet>)`, og testene kontrollerer at
 * fila er lik det den gir. Den
 *
 * 1. setter forbindelsen og datakortene på kodene i katalogen til det
 *    opprinnelige fagmiljøet (`intern.opprinnelig_fagmiljo()`), og bare der;
 * 2. skriver om hvert datakort som har en av de kodene i `data.gjelder`, til
 *    forbindelsen koden måler, som nye revisjoner med administratoren som
 *    forfatter: det publiserte publiseres med den nye nøkkelen, og et
 *    upublisert utkast beholder resten av endringene sine;
 * 3. stenger for alt annet enn en forbindelsesnøkkel i `gjelder` på
 *    datakortene, så ingen analyttkode kommer inn igjen.
 *
 * Kjøres den igjen, gjør den ingenting. Finnes ikke administratoren og det er
 * kort å skrive om, stopper den, i stedet for å la koden stå.
 */
import { createHash } from 'node:crypto'
import type { Katalogkodedata } from '../src/domain/analyttkatalog'
import { OUS_ANALYTTFORBINDELSER } from '../src/domain/ouskatalog'
import { DATAKORT } from '../src/faginnhold/paneler'

export const ANALYTTFORBINDELSESKILDE = 'Koblet til forbindelsen analysen måler i stedet for analyttkoden'

type Grunnlag = ReadonlyMap<string, Pick<Katalogkodedata, 'forbindelse' | 'datakort'>>

/** Kodene med forbindelsen og datakortene, i kodenes rekkefølge, slik migrasjonen legger dem inn. */
export function analyttforbindelserGrunnlag(forbindelser: Grunnlag = OUS_ANALYTTFORBINDELSER) {
  return [...forbindelser].map(([kode, { forbindelse, datakort }]) => ({ kode, forbindelse, datakort }))
}

const lit = (tekst: string) => `'${tekst.replaceAll("'", "''")}'`

export function analyttforbindelserSql(
  brukernavn: string,
  migrasjon: string,
  forbindelser: Grunnlag = OUS_ANALYTTFORBINDELSER,
): string {
  if (!/^[a-z0-9._-]+$/.test(brukernavn)) throw new Error('Ugyldig brukernavn.')
  if (!/^[0-9]{14}_[a-z0-9_]+\.sql$/.test(migrasjon)) throw new Error('Ugyldig filnavn for migrasjonen.')
  const data = JSON.stringify(analyttforbindelserGrunnlag(forbindelser))
  if (data.includes('$data$')) throw new Error('Importdataene kan ikke inneholde $data$.')
  const kontrollsum = createHash('md5').update(data).digest('hex')
  const datakort = DATAKORT.map((k) => lit(k.type)).join(', ')
  return `-- Forbindelsene analyttkodene til OUS Klinisk farmakologi måler og datakortene
-- de bruker, og de felles datakortene koblet til forbindelsen i stedet for
-- analyttkoden. Laget med analyttforbindelserSql('${brukernavn}', '${migrasjon}') i scripts/analyttforbindelser.ts;
-- testene kontrollerer at fila er lik det den gir.
select intern.endring_start('claude-code', '${migrasjon}', 'Datakortene for en metabolitt kobles til forbindelsen analysen måler, ikke til analyttkoden til OUS Klinisk farmakologi');
do $import$
declare
  importdata constant text := $data$${data}$data$;
  data jsonb := importdata::jsonb;
  fagmiljo uuid := intern.opprinnelig_fagmiljo();
  forfatter public.profiles;
  kort record;
  utkastet jsonb;
  publisert jsonb;
  status public.objektstatus;
begin
  if md5(importdata) <> '${kontrollsum}' then
    raise exception 'Importdataene er ikke de som ble laget: kontrollsummen stemmer ikke.';
  end if;
  if (select auth.uid()) is not null then
    raise exception 'Migrasjonen kjøres uten innlogget bruker.';
  end if;

  update public.analyttkatalog_koder k
  set forbindelse = d ->> 'forbindelse', datakort = d ->> 'datakort'
  from jsonb_array_elements(data) as x(d)
  where k.fagmiljo_id = fagmiljo and k.kode = d ->> 'kode'
    and (k.forbindelse, k.datakort) is distinct from (d ->> 'forbindelse', d ->> 'datakort');

  perform set_config('far.revisjonskilde', ${lit(ANALYTTFORBINDELSESKILDE)}, true);

  -- Kortene med en kode i gjelder, utkastet og det publiserte hver for seg.
  for kort in
    select
      u.objekt_id as id,
      u.revisjon,
      p.revisjon as publisert_revisjon,
      ru.innhold as utkastet,
      rp.innhold as publisert
    from public.objekttilstander u
    join public.redigerbare_objekter o on o.id = u.objekt_id and o.type = 'innholdselement'
    join public.objektrevisjoner ru on ru.objekt_id = u.objekt_id and ru.revisjon = u.revisjon
    left join public.objekttilstander p on p.objekt_id = u.objekt_id and p.tilstand = 'publisert'
    left join public.objektrevisjoner rp on rp.objekt_id = p.objekt_id and rp.revisjon = p.revisjon
    where u.tilstand = 'utkast'
      and exists (
        select 1
        from public.innholdselementer e
        join public.analyttkatalog_koder k on k.fagmiljo_id = fagmiljo and k.kode = e.data ->> 'gjelder'
        where e.objekt_id = u.objekt_id
          and e.elementtype in (${datakort})
          and k.forbindelse is not null
      )
    order by u.objekt_id
  loop
    if forfatter.id is null then
      select pr.* into forfatter from public.profiles pr where pr.username = '${brukernavn}';
      if not found then
        raise exception 'Datakortene kan ikke kobles til forbindelsene: ${brukernavn} finnes ikke her.';
      end if;
    end if;

    -- Innholdet med forbindelsen i stedet for koden; uendret uten en kjent kode.
    select coalesce(jsonb_set(kort.utkastet, '{data,gjelder}', to_jsonb(k.forbindelse)), kort.utkastet)
    into utkastet
    from (select 1) as en
    left join public.analyttkatalog_koder k
      on k.fagmiljo_id = fagmiljo and k.kode = kort.utkastet #>> '{data,gjelder}' and k.forbindelse is not null;
    select coalesce(jsonb_set(kort.publisert, '{data,gjelder}', to_jsonb(k.forbindelse)), kort.publisert)
    into publisert
    from (select 1) as en
    left join public.analyttkatalog_koder k
      on k.fagmiljo_id = fagmiljo and k.kode = kort.publisert #>> '{data,gjelder}' and k.forbindelse is not null;

    if kort.publisert_revisjon is null or kort.publisert_revisjon = kort.revisjon then
      status := intern.lagre_objekt(kort.id, kort.revisjon, utkastet, forfatter);
      if kort.publisert_revisjon is not null then
        perform intern.publiser_objekt(kort.id, status.revisjon, forfatter);
      end if;
    else
      -- Det publiserte først, med bare nøkkelen endret; så utkastet igjen over.
      status := intern.lagre_objekt(kort.id, kort.revisjon, publisert, forfatter);
      status := intern.publiser_objekt(kort.id, status.revisjon, forfatter);
      perform intern.lagre_objekt(kort.id, status.revisjon, utkastet, forfatter);
    end if;
    raise notice 'Datakortet % gjelder nå forbindelsen %.', kort.id, utkastet #>> '{data,gjelder}';
  end loop;
end
$import$;

-- Et datakort for en metabolitt sier hvilken forbindelse det gjelder, aldri en
-- analyttkode: nøkkelen i forbindelsesregisteret, med små bokstaver.
alter table public.innholdselementer
  add constraint innholdselementer_gjelder_forbindelse check (
    elementtype not in (${datakort})
    or nullif(data ->> 'gjelder', '') is null
    or (char_length(data ->> 'gjelder') <= 120 and data ->> 'gjelder' ~ '^[a-z0-9][a-z0-9-]*$')
  );

comment on constraint innholdselementer_gjelder_forbindelse on public.innholdselementer is
  'Et datakort med data.gjelder gjelder en forbindelse i forbindelsesregisteret (src/data/forbindelser.ts), ikke en analyttkode. Se docs/faginnhold.md.';
`
}
