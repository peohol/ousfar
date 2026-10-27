-- Egen kommentar for «kan ikke fastslås» når forrige prøve lå under cut-off
-- (Peder, 27.10.2026). Hittil fikk den situasjonen den vanlige
-- «kan ikke fastslås»-kommentaren. Beregningene er de samme.
--
-- Nøkkelen, tittelen og plassholderne er de samme som i
-- src/domain/thcTekster.ts. Kommentaren legges inn som publisert kommentar, og
-- regelsettet lagres og publiseres som en ny revisjon som peker på den, med
-- spørsmålsetningen sist. Reglene og de andre kommentarene er uendret.
--
-- Gjenopprettingen av eldre utgaver flyttes ut i en egen funksjon
-- (intern.thc_innhold_fra_eldre_utgave), så neste nye kommentar bare trenger
-- å endre den.

alter table public.thc_tekstbolker drop constraint thc_tekstbolker_nokkel;

-- --- Tekstene, som i src/domain/thcTekster.ts -------------------------------

create or replace function intern.thc_kommentarnokler()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'uten_forrige', 'uten_forrige_nylig', 'ikke_nodvendigvis', 'ikke_nodvendigvis_nylig',
    'vanskelig', 'vanskelig_nylig', 'nytt_inntak', 'nytt_inntak_nylig', 'samlet_vurdering',
    'under_cutoff_ikke_nodvendigvis', 'under_cutoff_vanskelig', 'kort_tid'
  ]
$$;

create or replace function intern.thc_tekstbolktittel(p_nokkel text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_nokkel
    when 'introsetning' then 'Introsetning'
    when 'sporsmalsetning' then 'Spørsmålsetning'
    when 'uten_forrige' then 'Ikke vurdert mot tidligere prøve (øvrige nivåer)'
    when 'uten_forrige_nylig' then 'Ikke vurdert mot tidligere prøve (nivå som tyder på nylig inntak)'
    when 'ikke_nodvendigvis' then 'Ikke nødvendigvis nytt (øvrige nivåer)'
    when 'ikke_nodvendigvis_nylig' then 'Ikke nødvendigvis nytt (nivå som tyder på nylig inntak)'
    when 'vanskelig' then 'Kan ikke fastslås (øvrige nivåer)'
    when 'vanskelig_nylig' then 'Kan ikke fastslås (nivå som tyder på nylig inntak)'
    when 'nytt_inntak' then 'Nytt inntak (øvrige nivåer)'
    when 'nytt_inntak_nylig' then 'Nytt inntak (nivå som tyder på nylig inntak)'
    when 'samlet_vurdering' then 'Samlet vurdering av flere tidligere prøver'
    when 'under_cutoff_ikke_nodvendigvis' then 'Under cut-off i forrige prøve · ikke nødvendigvis nytt'
    when 'under_cutoff_vanskelig' then 'Under cut-off i forrige prøve · kan ikke fastslås'
    when 'kort_tid' then 'Kort tid mellom prøvene'
  end
$$;

create or replace function intern.thc_tekstbolk_krever(p_nokkel text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when p_nokkel = 'introsetning' then array['{nivå}']
    when p_nokkel = 'samlet_vurdering' then array['{forrige prøvedato}', '{tidligere prøvedato}']
    when p_nokkel in (
      'ikke_nodvendigvis', 'ikke_nodvendigvis_nylig', 'vanskelig', 'vanskelig_nylig', 'nytt_inntak',
      'nytt_inntak_nylig', 'under_cutoff_ikke_nodvendigvis', 'under_cutoff_vanskelig'
    ) then array['{forrige prøvedato}']
    else array[]::text[]
  end
$$;

-- --- Eldre utgaver -----------------------------------------------------------

-- En utgave fra før de nåværende tekstene, gjort om så den kan lagres igjen:
-- reglene fra utgaven, og kommentarene den ikke kjente fra det regelsettet
-- bruker nå. Tekstene har sin egen historikk.
--
-- 1. Utgaver fra før tekstene ble egne kommentarer har tekstene i seg
--    (`tekster`), og utgaver fra før de nye kommentarene 12.10.2026 peker på
--    de gamle tekstbolkene, uten introsetningen. De får alle kommentarene,
--    grensen for kort tid og spørsmålsetningen fra regelsettet nå.
-- 2. Utgaver fra før 27.10.2026 mangler kommentaren for «kan ikke fastslås»
--    under cut-off. De får den, og spørsmålsetningen for den, fra
--    regelsettet nå.
-- Alt annet gis tilbake som det er, og valideres som vanlig.
create function intern.thc_innhold_fra_eldre_utgave(p_objekt uuid, p_innhold jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  -- Kommentarene som kom til etter 12.10.2026.
  nye constant text[] := array['under_cutoff_vanskelig'];
  manglende text[];
  bolker jsonb;
  utkast public.thc_regelsett;
begin
  if (p_innhold ? 'tekster' and not p_innhold ? 'tekstbolker')
    or (jsonb_typeof(p_innhold -> 'tekstbolker') = 'object' and not (p_innhold -> 'tekstbolker') ? 'introsetning')
  then
    manglende := intern.thc_tekstnokler();
  elsif jsonb_typeof(p_innhold -> 'tekstbolker') = 'object' and not (p_innhold -> 'tekstbolker') ?| nye then
    manglende := nye;
  else
    return p_innhold;
  end if;

  select jsonb_object_agg(b.nokkel, b.kommentar_id) into bolker
  from public.thc_tekstbolker b
  where b.objekt_id = p_objekt and b.tilstand = 'utkast' and b.nokkel = any (manglende);
  if bolker is null or (select count(*) from jsonb_object_keys(bolker)) <> cardinality(manglende) then
    raise exception 'Utgaven er fra før de nåværende tekstene, og regelsettet har ingen kommentarer å bruke i stedet.'
      using errcode = '22023';
  end if;
  select r.* into utkast from public.thc_regelsett r where r.objekt_id = p_objekt and r.tilstand = 'utkast';

  if manglende = nye then
    -- Spørsmålsetningen fra utgaven, og for de nye kommentarene fra nå, i fast rekkefølge.
    return jsonb_set(p_innhold, '{tekstbolker}', (p_innhold -> 'tekstbolker') || bolker)
      || jsonb_build_object('med_sporsmalsetning', (
        select coalesce(jsonb_agg(k order by n), '[]'::jsonb)
        from unnest(intern.thc_kommentarnokler()) with ordinality as x(k, n)
        where (jsonb_typeof(p_innhold -> 'med_sporsmalsetning') = 'array' and p_innhold -> 'med_sporsmalsetning' ? k)
          or (k = any (nye) and k = any (coalesce(utkast.med_sporsmalsetning, '{}')))
      ));
  end if;
  return (p_innhold - 'tekster') || jsonb_build_object('tekstbolker', bolker)
    || jsonb_build_object(
      'kort_tid_dager', coalesce(p_innhold -> 'kort_tid_dager', to_jsonb(coalesce(utkast.kort_tid_dager, 3))),
      'med_sporsmalsetning',
      coalesce(p_innhold -> 'med_sporsmalsetning', to_jsonb(utkast.med_sporsmalsetning), '[]'::jsonb));
end
$$;

-- --- Skrivingen, med eldre utgaver i egen funksjon ---------------------------

create or replace function intern.skriv_thc_regelsett_innhold(
  p_objekt uuid, p_tilstand public.objekttilstand, p_innhold jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  maleusikkerhet jsonb;
  kurver jsonb;
  kurve jsonb;
  rolle public.thc_kurverolle;
  element jsonb;
  nr integer;
  forrige_verdi double precision;
  verdi double precision;
  z double precision;
  standard double precision;
  varsel integer;
  monster text;
  monstre jsonb;
  vanskelig public.thc_kurverolle;
  nytt public.thc_kurverolle;
  bolker jsonb;
  nokkel text;
  kommentar uuid;
  plassholdere text[];
  avvik text;
  faktor double precision;
  kort_tid integer;
  sporsmal jsonb;
  sporsmalsliste text[];
  roller constant public.thc_kurverolle[] := enum_range(null::public.thc_kurverolle);
  hvor text;
begin
  -- Utgaver fra før de nåværende tekstene gjenopprettes med kommentarene
  -- regelsettet bruker nå (intern.thc_innhold_fra_eldre_utgave).
  p_innhold := intern.thc_innhold_fra_eldre_utgave(p_objekt, p_innhold);

  perform intern.krev_felt(p_innhold, array[
    'konverteringsfaktor', 'kurver', 'maleusikkerhet', 'sikkerhetsmarginer', 'standard_sikkerhetsmargin',
    'konsentrasjonsnivaer', 'bruksmonstre', 'varsel_dager_mellom', 'kort_tid_dager', 'med_sporsmalsetning',
    'tekstbolker'
  ]);

  faktor := intern.flyttall(p_innhold, 'konverteringsfaktor');
  if not faktor > 0 then
    raise exception 'Konverteringsfaktoren må være et tall større enn 0.' using errcode = '22023';
  end if;

  maleusikkerhet := intern.objekt(p_innhold, 'maleusikkerhet');
  perform intern.krev_felt(maleusikkerhet, array['cv_thc', 'cv_kreatinin', 'faktor_under_cutoff']);
  if not (intern.flyttall(maleusikkerhet, 'cv_thc') > 0 and intern.flyttall(maleusikkerhet, 'cv_thc') < 1) then
    raise exception 'CV for THC-syre må ligge mellom 0 og 1.' using errcode = '22023';
  end if;
  if not (intern.flyttall(maleusikkerhet, 'cv_kreatinin') > 0 and intern.flyttall(maleusikkerhet, 'cv_kreatinin') < 1) then
    raise exception 'CV for kreatinin må ligge mellom 0 og 1.' using errcode = '22023';
  end if;
  if not intern.flyttall(maleusikkerhet, 'faktor_under_cutoff') >= 1 then
    raise exception 'Faktoren for måleusikkerhet under cut-off må være minst 1.' using errcode = '22023';
  end if;

  -- Det finnes bare ett THC-syreregelsett.
  if exists (
    select 1 from public.thc_regelsett r
    where r.tilstand = p_tilstand and r.objekt_id <> p_objekt
  ) then
    raise exception 'Det finnes alt et THC-syreregelsett. Endre det i stedet for å lage et nytt.'
      using errcode = '22023';
  end if;

  standard := intern.flyttall(p_innhold, 'standard_sikkerhetsmargin');
  varsel := intern.heltall(p_innhold, 'varsel_dager_mellom');
  if varsel < 1 then
    raise exception 'Varselet om tid mellom prøvene må være et helt antall døgn, minst 1.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_innhold -> 'kort_tid_dager') is distinct from 'number'
    or (p_innhold ->> 'kort_tid_dager')::numeric <> trunc((p_innhold ->> 'kort_tid_dager')::numeric)
    or (p_innhold ->> 'kort_tid_dager')::numeric < 1
  then
    raise exception 'Grensen for kort tid mellom prøvene må være et helt antall døgn, minst 1.' using errcode = '22023';
  end if;
  kort_tid := intern.heltall(p_innhold, 'kort_tid_dager');

  -- Kommentarene som avsluttes med spørsmålsetningen: kommentarer, hver én
  -- gang, i fast rekkefølge, som validerThcRegelsett i thcRegelsett.ts.
  sporsmal := intern.liste(p_innhold, 'med_sporsmalsetning');
  if exists (select 1 from jsonb_array_elements(sporsmal) e where jsonb_typeof(e) is distinct from 'string') then
    raise exception 'Det må oppgis hvilke kommentarer som avsluttes med spørsmålsetningen.' using errcode = '22023';
  end if;
  sporsmalsliste := array(select e from jsonb_array_elements_text(sporsmal) with ordinality as x(e, n) order by n);
  select string_agg(k, ', ' order by n) into avvik
  from unnest(sporsmalsliste) with ordinality as x(k, n)
  where k <> all (intern.thc_kommentarnokler());
  if avvik is not null then
    raise exception 'Spørsmålsetningen er satt for en ukjent kommentar: %.', avvik using errcode = '22023';
  end if;
  if sporsmalsliste is distinct from array(
    select k from unnest(intern.thc_kommentarnokler()) with ordinality as x(k, n)
    where k = any (sporsmalsliste) order by n
  ) then
    raise exception 'Spørsmålsetningen må være satt én gang per kommentar, i fast rekkefølge.' using errcode = '22023';
  end if;

  insert into public.thc_regelsett (
    objekt_id, tilstand, konverteringsfaktor, cv_thc, cv_kreatinin, faktor_under_cutoff,
    standard_sikkerhetsmargin, varsel_dager_mellom, kort_tid_dager, med_sporsmalsetning
  )
  values (
    p_objekt, p_tilstand, faktor,
    intern.flyttall(maleusikkerhet, 'cv_thc'),
    intern.flyttall(maleusikkerhet, 'cv_kreatinin'),
    intern.flyttall(maleusikkerhet, 'faktor_under_cutoff'),
    standard, varsel, kort_tid, sporsmalsliste
  )
  on conflict on constraint thc_regelsett_pkey do update set
    konverteringsfaktor = excluded.konverteringsfaktor,
    cv_thc = excluded.cv_thc,
    cv_kreatinin = excluded.cv_kreatinin,
    faktor_under_cutoff = excluded.faktor_under_cutoff,
    standard_sikkerhetsmargin = excluded.standard_sikkerhetsmargin,
    varsel_dager_mellom = excluded.varsel_dager_mellom,
    kort_tid_dager = excluded.kort_tid_dager,
    med_sporsmalsetning = excluded.med_sporsmalsetning;

  delete from public.thc_kurver k where k.objekt_id = p_objekt and k.tilstand = p_tilstand;
  delete from public.thc_sikkerhetsmarginer m where m.objekt_id = p_objekt and m.tilstand = p_tilstand;
  delete from public.thc_konsentrasjonsnivaer n where n.objekt_id = p_objekt and n.tilstand = p_tilstand;
  delete from public.thc_bruksmonstre b where b.objekt_id = p_objekt and b.tilstand = p_tilstand;
  delete from public.thc_tekstbolker t where t.objekt_id = p_objekt and t.tilstand = p_tilstand;

  -- Kurvene.
  kurver := intern.objekt(p_innhold, 'kurver');
  perform intern.krev_felt(kurver, array['gronn', 'gul', 'rod']);
  foreach rolle in array enum_range(null::public.thc_kurverolle) loop
    kurve := intern.objekt(kurver, rolle::text);
    perform intern.krev_felt(kurve, array['navn', 'a1', 'k1', 'a2', 'k2']);
    if intern.tekst(kurve, 'navn') = '' then
      raise exception 'Den % kurven mangler navn.', intern.thc_kurvefarge(rolle) using errcode = '22023';
    end if;
    if not (intern.flyttall(kurve, 'a1') > 0 and intern.flyttall(kurve, 'k1') > 0
      and intern.flyttall(kurve, 'a2') > 0 and intern.flyttall(kurve, 'k2') > 0)
    then
      raise exception '%: a1, k1, a2 og k2 må være tall større enn 0.', intern.tekst(kurve, 'navn')
        using errcode = '22023';
    end if;
    insert into public.thc_kurver (objekt_id, tilstand, rolle, navn, a1, k1, a2, k2)
    values (
      p_objekt, p_tilstand, rolle, intern.tekst(kurve, 'navn'),
      intern.flyttall(kurve, 'a1'), intern.flyttall(kurve, 'k1'),
      intern.flyttall(kurve, 'a2'), intern.flyttall(kurve, 'k2')
    );
  end loop;

  -- Grønn skal gi minst like rask utskillelse som gul, og gul som rød, ved
  -- alle konsentrasjoner: da forventer den minst like stor nedgang fra enhver
  -- forrige prøve over ethvert tidsrom. Avgjort for hele domenet, som
  -- sammenlign i src/domain/thcKurver.ts, der beviset står.
  for nr in 1 .. cardinality(roller) - 1 loop
    select intern.thc_rekkefolgebrudd(
      r.a1 * faktor, r.k1, r.a2 * faktor, r.k2,
      t.a1 * faktor, t.k1, t.a2 * faktor, t.k2
    ) into hvor
    from public.thc_kurver r, public.thc_kurver t
    where r.objekt_id = p_objekt and r.tilstand = p_tilstand and r.rolle = roller[nr]
      and t.objekt_id = p_objekt and t.tilstand = p_tilstand and t.rolle = roller[nr + 1];
    if hvor is not null then
      raise exception 'Den % kurven må gi minst like rask utskillelse som den % ved alle konsentrasjoner, men gjør det ikke %.',
        intern.thc_kurvefarge(roller[nr]), intern.thc_kurvefarge(roller[nr + 1]), hvor
        using errcode = '22023';
    end if;
  end loop;

  -- Sikkerhetsmarginene.
  if jsonb_array_length(intern.liste(p_innhold, 'sikkerhetsmarginer')) = 0 then
    raise exception 'Det må finnes minst én sikkerhetsmargin.' using errcode = '22023';
  end if;
  forrige_verdi := null;
  for element in select e from jsonb_array_elements(p_innhold -> 'sikkerhetsmarginer') e loop
    perform intern.krev_felt(element, array['margin', 'z']);
    verdi := intern.flyttall(element, 'margin');
    z := intern.flyttall(element, 'z');
    if not (verdi >= 0.5 and verdi < 1) then
      raise exception 'En sikkerhetsmargin må være minst 50 %% og under 100 %%.' using errcode = '22023';
    end if;
    if forrige_verdi is not null and not verdi > forrige_verdi then
      raise exception 'Sikkerhetsmarginene må stå stigende, uten like.' using errcode = '22023';
    end if;
    if not abs(z - intern.normalkvantil(1 - verdi)) <= 1e-9 then
      raise exception 'z-verdien for % %% stemmer ikke med marginen.', verdi * 100 using errcode = '22023';
    end if;
    insert into public.thc_sikkerhetsmarginer (objekt_id, tilstand, margin, z)
    values (p_objekt, p_tilstand, verdi, z);
    forrige_verdi := verdi;
  end loop;
  if not exists (
    select 1 from public.thc_sikkerhetsmarginer m
    where m.objekt_id = p_objekt and m.tilstand = p_tilstand and m.margin = standard
  ) then
    raise exception 'Standardmarginen må være en av sikkerhetsmarginene.' using errcode = '22023';
  end if;

  -- Konsentrasjonsnivåene.
  if jsonb_array_length(intern.liste(p_innhold, 'konsentrasjonsnivaer')) = 0 then
    raise exception 'Det må finnes minst ett konsentrasjonsnivå.' using errcode = '22023';
  end if;
  forrige_verdi := null;
  for element, nr in
    select e, n from jsonb_array_elements(p_innhold -> 'konsentrasjonsnivaer') with ordinality as x(e, n)
  loop
    perform intern.krev_felt(element, array['navn', 'nedre', 'nylig_inntak']);
    if intern.tekst(element, 'navn') = '' then
      raise exception 'Et konsentrasjonsnivå mangler navn.' using errcode = '22023';
    end if;
    if nr = 1 then
      if jsonb_typeof(element -> 'nedre') <> 'null' then
        raise exception 'Det laveste konsentrasjonsnivået skal ikke ha nedre grense.' using errcode = '22023';
      end if;
      verdi := null;
    else
      if jsonb_typeof(element -> 'nedre') is distinct from 'number' or not (element ->> 'nedre')::double precision > 0 then
        raise exception 'Skillepunktet under «%» må være et tall større enn 0.', intern.tekst(element, 'navn')
          using errcode = '22023';
      end if;
      verdi := (element ->> 'nedre')::double precision;
      if forrige_verdi is not null and not verdi > forrige_verdi then
        raise exception 'Skillepunktene mellom konsentrasjonsnivåene må være stigende.' using errcode = '22023';
      end if;
      forrige_verdi := verdi;
    end if;
    if exists (
      select 1 from public.thc_konsentrasjonsnivaer n
      where n.objekt_id = p_objekt and n.tilstand = p_tilstand and n.navn = intern.tekst(element, 'navn')
    ) then
      raise exception 'To konsentrasjonsnivåer har samme navn.' using errcode = '22023';
    end if;
    insert into public.thc_konsentrasjonsnivaer (objekt_id, tilstand, posisjon, navn, nedre, nylig_inntak)
    values (
      p_objekt, p_tilstand, nr, intern.tekst(element, 'navn'), verdi,
      intern.sannhetsverdi(element, 'nylig_inntak')
    );
  end loop;

  -- Bruksmønstrene.
  monstre := intern.objekt(p_innhold, 'bruksmonstre');
  perform intern.krev_felt(monstre, array['kronisk', 'ikke_kronisk']);
  foreach monster in array array['kronisk', 'ikke_kronisk'] loop
    element := intern.objekt(monstre, monster);
    perform intern.krev_felt(element, array['vanskelig_over', 'nytt_inntak_over']);
    if intern.tekst(element, 'vanskelig_over') <> all (enum_range(null::public.thc_kurverolle)::text[])
      or intern.tekst(element, 'nytt_inntak_over') <> all (enum_range(null::public.thc_kurverolle)::text[])
    then
      raise exception 'Grensene % peker på en ukjent kurve.', replace(replace(monster, 'ikke_kronisk', 'uten kronisk bruk'), 'kronisk', 'ved kronisk bruk')
        using errcode = '22023';
    end if;
    vanskelig := intern.tekst(element, 'vanskelig_over')::public.thc_kurverolle;
    nytt := intern.tekst(element, 'nytt_inntak_over')::public.thc_kurverolle;
    if not vanskelig < nytt then
      raise exception 'Grensene %: nytt inntak må ligge på en tregere kurve enn «kan ikke fastslås».', case monster when 'kronisk' then 'ved kronisk bruk' else 'uten kronisk bruk' end
        using errcode = '22023';
    end if;
    insert into public.thc_bruksmonstre (objekt_id, tilstand, kronisk, vanskelig_over, nytt_inntak_over)
    values (p_objekt, p_tilstand, monster = 'kronisk', vanskelig, nytt);
  end loop;

  -- Kommentaren hver tekst bruker. Plassholderne i en kommentar endres
  -- aldri, så det som godtas her, holder også etter senere tekstendringer.
  bolker := intern.objekt(p_innhold, 'tekstbolker');
  perform intern.krev_felt(bolker, intern.thc_tekstnokler());
  foreach nokkel in array intern.thc_tekstnokler() loop
    kommentar := intern.id(bolker, nokkel);
    select k.plassholdere into plassholdere
    from public.kommentarer k
    where k.objekt_id = kommentar
    limit 1;
    if not found then
      raise exception 'Teksten «%» må peke på en kommentar.', intern.thc_tekstbolktittel(nokkel)
        using errcode = '22023';
    end if;
    select string_agg(p, ', ' order by p collate "C") into avvik
    from unnest(plassholdere) p where p <> all (intern.thc_tekstbolk_kan(nokkel));
    if avvik is not null then
      raise exception 'Teksten «%» har plassholdere den ikke kan bruke: %.', intern.thc_tekstbolktittel(nokkel), avvik
        using errcode = '22023';
    end if;
    select p into avvik
    from unnest(intern.thc_tekstbolk_krever(nokkel)) with ordinality as x(p, n)
    where p <> all (plassholdere)
    order by n
    limit 1;
    if avvik is not null then
      raise exception 'Teksten «%» må inneholde %.', intern.thc_tekstbolktittel(nokkel), avvik
        using errcode = '22023';
    end if;
    insert into public.thc_tekstbolker (objekt_id, tilstand, nokkel, kommentar_id)
    values (p_objekt, p_tilstand, nokkel, kommentar);
  end loop;
end;
$$;

revoke all on all functions in schema intern from public, anon, authenticated, service_role;

-- --- Den nye kommentaren, og regelsettet lagret på nytt ---------------------

do $ny_kommentar$
declare
  objekt uuid;
  utkast public.objektrevisjoner;
  publisert integer;
  status public.objektstatus;
  tekst constant text := $tekst$Analyseresultatet viser at cannabis har vært inntatt – men gir i seg selv ikke grunnlag for å fastslå om inntaket har skjedd etter prøven tatt {forrige prøvedato} selv om den ble rapportert som «ikke påvist». Lave konsentrasjoner av THC-syre kan svinge over og under påvisningsgrensen uten at dette nødvendigvis skyldes nytt inntak.$tekst$;
  sporsmal jsonb;
begin
  select o.id into objekt from public.redigerbare_objekter o where o.type = 'thc_regelsett';
  if objekt is null then
    return;
  end if;
  select r.* into utkast
  from public.objekttilstander t
  join public.objektrevisjoner r on r.objekt_id = t.objekt_id and r.revisjon = t.revisjon
  where t.objekt_id = objekt and t.tilstand = 'utkast';
  select t.revisjon into publisert
  from public.objekttilstander t
  where t.objekt_id = objekt and t.tilstand = 'publisert';
  if publisert is distinct from utkast.revisjon then
    raise exception 'THC-syreregelsettet har et utkast som ikke er publisert. Kommentaren legges ikke inn før det er avklart.';
  end if;

  -- Som den som lagret regelsettet sist, gjennom de vanlige funksjonene.
  perform set_config('request.jwt.claims',
    json_build_object('sub', utkast.utfort_av, 'role', 'authenticated')::text, true);
  perform set_config('far.revisjonskilde', 'Egen kommentar for «kan ikke fastslås» under cut-off, bestilt av Peder 27.10.2026', true);
  status := public.opprett_utkast('kommentar', jsonb_build_object(
    'navn', 'THC-syre: ' || intern.thc_tekstbolktittel('under_cutoff_vanskelig'),
    'tekst', tekst,
    'plassholdere', to_jsonb(intern.plassholdere_i(tekst))
  ));
  perform public.publiser_utkast(status.id, status.revisjon);

  -- Spørsmålsetningen sist, i fast rekkefølge med de andre.
  select jsonb_agg(k order by n) into sporsmal
  from unnest(intern.thc_kommentarnokler()) with ordinality as x(k, n)
  where utkast.innhold -> 'med_sporsmalsetning' ? k or k = 'under_cutoff_vanskelig';

  status := public.lagre_utkast(objekt, utkast.revisjon, utkast.innhold || jsonb_build_object(
    'tekstbolker', (utkast.innhold -> 'tekstbolker') || jsonb_build_object('under_cutoff_vanskelig', status.id),
    'med_sporsmalsetning', sporsmal
  ));
  perform public.publiser_utkast(objekt, status.revisjon);
end
$ny_kommentar$;

-- Samme nøkler som THC_TEKSTNOKLER i src/domain/thcTekster.ts.
alter table public.thc_tekstbolker add constraint thc_tekstbolker_nokkel check (nokkel in (
    'introsetning', 'sporsmalsetning', 'uten_forrige', 'uten_forrige_nylig', 'ikke_nodvendigvis',
    'ikke_nodvendigvis_nylig', 'vanskelig', 'vanskelig_nylig', 'nytt_inntak', 'nytt_inntak_nylig',
    'samlet_vurdering', 'under_cutoff_ikke_nodvendigvis', 'under_cutoff_vanskelig', 'kort_tid'
));
