/**
 * Det syntetiske datagrunnlaget for ytelsesmålingen (`ytelse.ts`,
 * `docs/ytelse-maling.md`), i det lokale testmiljøet. Alt er syntetisk og
 * deterministisk: samme antall gir de samme personene og sidene, så målingene
 * før og etter en endring bruker de samme dataene.
 *
 * - **Personer** i et valgt antall (50, 500, 5 000 …), med brukernavn
 *   `ys<nr>.<initialer>`. De fordeles mellom de to fagmiljøene migrasjonene
 *   lager, med aktive, avsluttede og inviterte medlemskap, noen lokale
 *   administratorer, stillinger, direktemeldinger slått på for noen og
 *   blokkeringer. Navnene har æ, ø, å, aksenter, bindestrek og to fornavn, så
 *   søket prøves på det det skal tåle. Kontoene opprettes gjennom de samme
 *   utløserne som en ekte konto (`handter_ny_auth_bruker`), så profilen og
 *   standardmedlemskapet blir som i produksjonen.
 * - **Måleboerne**: `qa-ytelse-lokal` (lokal administrator i standardfagmiljøet,
 *   ikke systemarkitekt) og `qa-ytelse-medlem` (vanlig medlem med
 *   direktemeldinger slått på). `qa-admin` er systemarkitekt og ser alle.
 * - **Fagsider** i produksjonens form (`PRODUKSJONSFORM`), laget med
 *   `syntetiskeFagsiderSql`, og de første {@link KOBLEDE_SIDER} koblet til et
 *   virkestoff i FEST-uttrekkene, så preparat- og interaksjonspanelene henter
 *   som på en ekte side.
 *
 * Bare for det lokale testmiljøet: SQL-en kjøres som databasens eier.
 */
import { PRODUKSJONSFORM, syntetiskeFagsiderSql } from '../hjelp/syntetiskeFagsider'
import { lokalSql, sikreTestkonto, type Status } from './lokalmiljo'

/** Prefikset de syntetiske personene har i brukernavnet. */
export const PERSONPREFIKS = 'ys'

/** Fagsider som får en kobling til FEST (de første i rekkefølgen). */
export const KOBLEDE_SIDER = 12

/** Virkestoffet de koblede sidene peker på: finnes i FEST-uttrekkene mellomtjeneren svarer fra. */
const VIRKESTOFF = { fest_id: 'ID_1C2C9254-987B-4A37-AC48-6349BB671F07', navn: 'Sertralin' }

const FORNAVN = [
  'Ola', 'Kari', 'Åse', 'Øystein', 'Ærlend', 'Bjørn', 'Siv', 'Kari-Anne', 'Jan Erik', 'Zoë',
  'Renée', 'José', 'Mette', 'Håkon', 'Ingrid', 'Per', 'Solveig', 'Tor', 'Anne Marie', 'Nils',
  'Liv', 'Eirik', 'Marit', 'Sondre', 'Hege', 'Ståle', 'Tone', 'Gøran', 'Aud', 'Mohammed',
  'Fatima', 'Ahmed', 'Linh', 'Mai', 'Jonas', 'Emma', 'Noah', 'Sara', 'Lukas', 'Nora',
]
const ETTERNAVN = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen',
  'Ødegård', 'Ås', 'Bjørnstad', 'Sæther', 'Lefèvre', 'Müller', 'Johansen-Ås', 'Strøm', 'Haugen', 'Berg',
  'Dahl', 'Lie', 'Moen', 'Solberg', 'Bakke', 'Fjære', 'Grønli', 'Håland', 'Våge', 'Østby',
  'Nguyen', 'Ali', 'Khan', 'Tran', 'Rød', 'Aas', 'Brekke', 'Lund', 'Eriksen', 'Holm',
]

const sqlListe = (verdier: readonly string[]) => `array[${verdier.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')}]`

/** Måleboernes brukernavn. */
export const MALEBOERE = { lokal: 'qa-ytelse-lokal', medlem: 'qa-ytelse-medlem' } as const

export interface Ytelsesdata {
  personer: number
  /** Fagmiljøene: standarden og det andre. */
  fagmiljo: { standard: string; annet: string }
  /** Passordene til måleboerne (nye hver kjøring). */
  passord: Record<keyof typeof MALEBOERE, string>
  ider: Record<keyof typeof MALEBOERE, string>
  /** Nøklene til fagsidene, i rekkefølge; de første {@link KOBLEDE_SIDER} er koblet til FEST. */
  fagsider: string[]
}

/** Antallet syntetiske personer som finnes nå. */
export const antallPersoner = (s: Status): number =>
  Number(lokalSql(s, `select count(*) from public.profiles where username ~ '^${PERSONPREFIKS}[0-9]{5}\\.'`))

/**
 * Gjør antallet syntetiske personer nøyaktig `antall`: lager dem som mangler
 * (nummer for nummer, så de samme numrene alltid blir de samme personene) og
 * fjerner dem over antallet. Fjerningen går utenom utløserne (som ellers
 * nekter å slette medlemskap), og bare for de syntetiske personene.
 */
export function sikrePersoner(s: Status, antall: number, maler: { lokal: string; medlem: string }): void {
  const fra = antallPersoner(s)
  if (fra > antall) {
    lokalSql(
      s,
      `begin;
       set local session_replication_role = replica;
       create temp table ys_bort on commit drop as
         select id from public.profiles where username ~ '^${PERSONPREFIKS}[0-9]{5}\\.' and substr(username, ${PERSONPREFIKS.length + 1}, 5)::int > ${antall};
       delete from public.direktemelding_blokkeringer where blokkerer in (select id from ys_bort) or blokkert in (select id from ys_bort);
       delete from public.chatvalg where bruker_id in (select id from ys_bort);
       delete from public.fagmiljoadministratorer where bruker_id in (select id from ys_bort);
       delete from public.medlemskap where bruker_id in (select id from ys_bort);
       delete from public.profiles where id in (select id from ys_bort);
       delete from auth.users where id in (select id from ys_bort);
       commit;`,
    )
  }
  if (fra >= antall) return
  // Hver person lages i sin egen transaksjon (en blokk per 250), som når kontoene opprettes én og én.
  for (let start = fra + 1; start <= antall; start += 250) {
    const slutt = Math.min(antall, start + 249)
    lokalSql(s, personerSql(start, slutt, maler))
  }
  lokalSql(s, 'analyze public.profiles; analyze public.medlemskap; analyze public.chatvalg; analyze public.direktemelding_blokkeringer;')
}

/**
 * SQL som lager personene `fra`–`til`. Fordelingen etter `(nummer × 37) mod 100`, så også små utvalg får alle slagene:
 * 0–69 bare standardfagmiljøet, 70–84 bare det andre, 85–91 begge, 92–95
 * avsluttet (ingen aktive medlemskap), 96–97 invitert til det andre, 98 lokal
 * administrator i standarden, 99 lokal administrator i det andre. Hver tredje
 * har en stilling, to av fem har slått på direktemeldinger, og hver 25. har
 * blokkert vanlig-medlem-måleren (hver 40. er blokkert av den).
 */
function personerSql(fra: number, til: number, maler: { lokal: string; medlem: string }): string {
  return /* sql */ `
do $ys$
declare
  fornavn text[] := ${sqlListe(FORNAVN)};
  etternavn text[] := ${sqlListe(ETTERNAVN)};
  fm_standard uuid := (select f.id from public.fagmiljoer f where f.standard);
  fm_annet uuid := (select f.id from public.fagmiljoer f where not f.standard and f.status = 'aktiv' order by f.nokkel limit 1);
  stillinger uuid[] := array(select id from public.stillinger order by id);
  fn text; en text; brukernavn text; bruker uuid; rest int;
begin
  perform set_config('ousfar.tilgangsgrunn', 'Ytelsesmåling (syntetisk)', true);
  for i in ${fra}..${til} loop
    fn := fornavn[1 + (i * 7) % cardinality(fornavn)];
    en := etternavn[1 + (i * 13 + i / 40) % cardinality(etternavn)];
    brukernavn := format('${PERSONPREFIKS}%s.%s%s', lpad(i::text, 5, '0'),
      left(regexp_replace(intern.personsokfold(fn), '[^a-z]', '', 'g'), 3),
      left(regexp_replace(intern.personsokfold(en), '[^a-z]', '', 'g'), 3));
    bruker := gen_random_uuid();
    insert into public.kontoreservasjoner (username) values (brukernavn);
    insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
    values (bruker, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            brukernavn || '@' || public.intern_auth_domene(), now(), now(), now());
    update public.profiles
    set first_name = fn, last_name = en, must_change_password = false, onboarding_completed = true,
        stilling_id = case when i % 3 = 0 and cardinality(stillinger) > 0 then stillinger[1 + i % cardinality(stillinger)] end
    where id = bruker;

    rest := (i * 37) % 100;
    if rest between 70 and 84 or rest = 99 then
      insert into public.medlemskap (bruker_id, fagmiljo_id) values (bruker, fm_annet);
      update public.medlemskap set primaer = false where bruker_id = bruker and fagmiljo_id = fm_standard;
      update public.medlemskap set primaer = true where bruker_id = bruker and fagmiljo_id = fm_annet;
      update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = bruker and fagmiljo_id = fm_standard;
    elsif rest between 85 and 91 then
      insert into public.medlemskap (bruker_id, fagmiljo_id) values (bruker, fm_annet);
    elsif rest between 92 and 95 then
      update public.medlemskap set primaer = false, status = 'deaktivert', til = now() where bruker_id = bruker;
    elsif rest between 96 and 97 then
      insert into public.medlemskap (bruker_id, fagmiljo_id, status) values (bruker, fm_annet, 'invitert');
    end if;
    if rest = 98 then
      insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values (bruker, fm_standard);
    elsif rest = 99 then
      insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values (bruker, fm_annet);
    end if;

    if i % 5 < 2 then
      insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values (bruker, true);
    end if;
    if i % 25 = 0 then
      insert into public.direktemelding_blokkeringer (blokkerer, blokkert) values (bruker, '${maler.medlem}');
    elsif i % 40 = 0 then
      insert into public.direktemelding_blokkeringer (blokkerer, blokkert) values ('${maler.medlem}', bruker);
    end if;
  end loop;
end
$ys$;`
}

/** Måleboerne, med nye passord: den lokale administratoren og det vanlige medlemmet. */
async function sikreMaleboere(s: Status): Promise<Pick<Ytelsesdata, 'passord' | 'ider'>> {
  const passord = { lokal: crypto.randomUUID(), medlem: crypto.randomUUID() }
  const ider = {
    lokal: await sikreTestkonto(s, MALEBOERE.lokal, passord.lokal, ['Lokal', 'Ytelsesmåler']),
    medlem: await sikreTestkonto(s, MALEBOERE.medlem, passord.medlem, ['Medlem', 'Ytelsesmåler']),
  }
  lokalSql(
    s,
    `select set_config('ousfar.tilgangsgrunn', 'Ytelsesmåling (syntetisk)', true);
     insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id)
       select '${ider.lokal}', f.id from public.fagmiljoer f where f.standard
       and not exists (select 1 from public.fagmiljoadministratorer a where a.bruker_id = '${ider.lokal}' and a.til is null);
     insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values ('${ider.medlem}', true)
       on conflict (bruker_id) do update set tillat_direktemeldinger = true;`,
  )
  return { passord, ider }
}

/** Navnet en syntetisk fagside har, fra nøkkelen (`syntetisk-stoff-007` → «Syntetisk stoff 007»). */
export const stoffnavn = (slug: string) => `Syntetisk stoff ${slug.replace('syntetisk-stoff-', '')}`

/** De første sidene som har en publisert FEST-kobling (`legemiddelkobling`). */
const koblingerSql = `select count(*) from (
    select objekt_id from public.infosider where tilstand = 'publisert' and slug like 'syntetisk-stoff-%' order by slug limit ${KOBLEDE_SIDER}
  ) side
  where exists (
    select 1 from public.objektutgaver u
    where u.tilstand = 'publisert' and u.innhold ->> 'elementtype' = 'legemiddelkobling' and u.innhold ->> 'infoside' = side.objekt_id::text
  )`

/**
 * Fagsidene: lages én gang (de tar noen minutter), og gjenbrukes til databasen
 * bygges på nytt. FEST-koblingene sjekkes og rettes for seg, så en kjøring som
 * ble avbrutt mellom sidene og koblingene, ikke gjenbruker sider uten kobling.
 */
function sikreFagsider(s: Status, admin: string): string[] {
  const finnes = Number(lokalSql(s, `select count(*) from public.infosider where tilstand = 'publisert' and slug like 'syntetisk-stoff-%'`))
  if (finnes < PRODUKSJONSFORM.sider) {
    console.log(`[ytelsesdata] lager ${PRODUKSJONSFORM.sider} syntetiske fagsider (noen minutter første gang)`)
    lokalSql(s, `begin; ${somBruker(admin)} ${syntetiskeFagsiderSql(PRODUKSJONSFORM)} commit;`)
  }
  if (Number(lokalSql(s, koblingerSql)) < KOBLEDE_SIDER) {
    lokalSql(
      s,
      `begin; ${somBruker(admin)}
       do $kobling$
       declare side record; e record;
       begin
         for side in
           select i.objekt_id from (
             select objekt_id from public.infosider where tilstand = 'publisert' and slug like 'syntetisk-stoff-%' order by slug limit ${KOBLEDE_SIDER}
           ) i
           where not exists (
             select 1 from public.objektutgaver u
             where u.innhold ->> 'elementtype' = 'legemiddelkobling' and u.innhold ->> 'infoside' = i.objekt_id::text
           )
         loop
           perform public.opprett_utkast('innholdselement', jsonb_build_object(
             'infoside', side.objekt_id, 'panel', 'preparater', 'posisjon', 0, 'elementtype', 'legemiddelkobling',
             'data', jsonb_build_object('virkestoff', jsonb_build_array(jsonb_build_object('fest_id', '${VIRKESTOFF.fest_id}', 'navn', '${VIRKESTOFF.navn}')))));
         end loop;
         for e in
           select t.objekt_id, t.revisjon from public.objekttilstander t join public.redigerbare_objekter o on o.id = t.objekt_id
           where t.tilstand = 'utkast' and o.type = 'innholdselement'
             and not exists (select 1 from public.objekttilstander p where p.objekt_id = t.objekt_id and p.tilstand = 'publisert')
             and (select u.innhold ->> 'elementtype' from public.objektutgaver u where u.objekt_id = t.objekt_id and u.tilstand = 'utkast') = 'legemiddelkobling'
         loop
           perform public.publiser_utkast(e.objekt_id, e.revisjon);
         end loop;
       end
       $kobling$;
       commit;`,
    )
    const koblet = Number(lokalSql(s, koblingerSql))
    if (koblet < KOBLEDE_SIDER) throw new Error(`Bare ${koblet} av ${KOBLEDE_SIDER} fagsider fikk FEST-kobling.`)
  }
  if (finnes < PRODUKSJONSFORM.sider) lokalSql(s, 'analyze;')
  return lokalSql(s, `select slug from public.infosider where tilstand = 'publisert' and slug like 'syntetisk-stoff-%' order by slug`).split('\n')
}

/** Det API-et gjør for en innlogget bruker: rollen `authenticated` og bruker-ID-en i JWT-kravene. */
export const somBruker = (bruker: string) =>
  `set local role authenticated; set local request.jwt.claims to '{"sub":"${bruker}","role":"authenticated"}';`

/** Hele datagrunnlaget for `personer` syntetiske personer; `admin` er ID-en til `qa-admin`. */
export async function sikreYtelsesdata(s: Status, admin: string, personer: number): Promise<Ytelsesdata> {
  const maleboere = await sikreMaleboere(s)
  sikrePersoner(s, personer, maleboere.ider)
  const fagsider = sikreFagsider(s, admin)
  const id = (sql: string) => lokalSql(s, sql)
  return {
    personer,
    fagmiljo: {
      standard: id(`select id from public.fagmiljoer where standard`),
      annet: id(`select id from public.fagmiljoer where not standard and status = 'aktiv' order by nokkel limit 1`),
    },
    ...maleboere,
    fagsider,
  }
}

/** Størrelsen på datagrunnlaget, til rapporten. */
export function datamengde(s: Status): Record<string, number> {
  const rad = lokalSql(
    s,
    `select json_build_object(
       'profiler', (select count(*) from public.profiles),
       'syntetiske_personer', (select count(*) from public.profiles where username ~ '^${PERSONPREFIKS}[0-9]{5}\\.'),
       'aktive_medlemskap', (select count(*) from public.medlemskap where status = 'aktiv'),
       'avsluttede_medlemskap', (select count(*) from public.medlemskap where status = 'deaktivert'),
       'inviterte_medlemskap', (select count(*) from public.medlemskap where status = 'invitert'),
       'lokale_administratorer', (select count(*) from public.fagmiljoadministratorer where til is null),
       'direktemeldinger_pa', (select count(*) from public.chatvalg where tillat_direktemeldinger),
       'blokkeringer', (select count(*) from public.direktemelding_blokkeringer),
       'publiserte_fagsider', (select count(*) from public.infosider where tilstand = 'publisert'),
       'objektutgaver', (select count(*) from public.objektutgaver),
       'analyttkatalog_oppforinger', (select count(*) from public.analyttkatalog_oppforinger)
     )`,
  )
  return JSON.parse(rad) as Record<string, number>
}
