-- Forbindelsene analyttkodene til OUS Klinisk farmakologi måler og datakortene
-- de bruker, og de felles datakortene koblet til forbindelsen i stedet for
-- analyttkoden. Laget med analyttforbindelserSql('peohol', '20261115112100_analyttforbindelser_ous.sql') i scripts/analyttforbindelser.ts;
-- testene kontrollerer at fila er lik det den gir.
select intern.endring_start('claude-code', '20261115112100_analyttforbindelser_ous.sql', 'Datakortene for en metabolitt kobles til forbindelsen analysen måler, ikke til analyttkoden til OUS Klinisk farmakologi');
do $import$
declare
  importdata constant text := $data$[{"kode":"AMTNORSUM","forbindelse":null,"datakort":"egne"},{"kode":"CITAL","forbindelse":"citalopram","datakort":"egne"},{"kode":"DOKSUM","forbindelse":null,"datakort":"egne"},{"kode":"DULO","forbindelse":"duloksetin","datakort":"egne"},{"kode":"ESCIT","forbindelse":"escitalopram","datakort":"egne"},{"kode":"FLUOSUM","forbindelse":null,"datakort":"egne"},{"kode":"FLUV","forbindelse":"fluvoksamin","datakort":"egne"},{"kode":"HBUP","forbindelse":"hydroksybupropion","datakort":"egne"},{"kode":"KLOSUM","forbindelse":null,"datakort":"egne"},{"kode":"MIASUM","forbindelse":null,"datakort":"egne"},{"kode":"MTZ","forbindelse":"mirtazapin","datakort":"egne"},{"kode":"NOR","forbindelse":"nortriptylin","datakort":"egne"},{"kode":"PARO","forbindelse":"paroksetin","datakort":"egne"},{"kode":"SERT","forbindelse":"sertralin","datakort":"egne"},{"kode":"TRIM","forbindelse":"trimipramin","datakort":"egne"},{"kode":"VENSUM","forbindelse":null,"datakort":"egne"},{"kode":"VOR","forbindelse":"vortioksetin","datakort":"egne"},{"kode":"AMIS","forbindelse":"amisulprid","datakort":"egne"},{"kode":"ARISUM","forbindelse":null,"datakort":"egne"},{"kode":"BREK","forbindelse":"brekspiprazol","datakort":"egne"},{"kode":"FLUP","forbindelse":"flupentiksol","datakort":"egne"},{"kode":"HALO","forbindelse":"haloperidol","datakort":"egne"},{"kode":"KARSUM","forbindelse":null,"datakort":"egne"},{"kode":"KLORP","forbindelse":"klorprotiksen","datakort":"egne"},{"kode":"KLOZ","forbindelse":"klozapin","datakort":"egne"},{"kode":"KVE","forbindelse":"kvetiapin","datakort":"egne"},{"kode":"LMP","forbindelse":"levomepromazin","datakort":"egne"},{"kode":"LURA","forbindelse":"lurasidon","datakort":"egne"},{"kode":"OLAN","forbindelse":"olanzapin","datakort":"egne"},{"kode":"PALI","forbindelse":"paliperidon","datakort":"egne"},{"kode":"PERF","forbindelse":"perfenazin","datakort":"egne"},{"kode":"RISPSUM","forbindelse":null,"datakort":"egne"},{"kode":"ZIPRA","forbindelse":"ziprasidon","datakort":"egne"},{"kode":"ZUKLO","forbindelse":"zuklopentiksol","datakort":"egne"},{"kode":"LAM","forbindelse":"lamotrigin","datakort":"egne"},{"kode":"ENAT","forbindelse":"enalaprilat","datakort":"egne"},{"kode":"LISI","forbindelse":"lisinopril","datakort":"egne"},{"kode":"RAMAT","forbindelse":"ramiprilat","datakort":"egne"},{"kode":"EPLR","forbindelse":"eplerenon","datakort":"egne"},{"kode":"KANR","forbindelse":"kanrenon","datakort":"egne"},{"kode":"KARV","forbindelse":"karvedilol","datakort":"egne"},{"kode":"LABE","forbindelse":"labetalol","datakort":"egne"},{"kode":"DOKSA","forbindelse":"doksazosin","datakort":"egne"},{"kode":"IRBE","forbindelse":"irbesartan","datakort":"egne"},{"kode":"KAND","forbindelse":"kandesartan","datakort":"egne"},{"kode":"LOSYR","forbindelse":"losartansyre","datakort":"egne"},{"kode":"TELM","forbindelse":"telmisartan","datakort":"egne"},{"kode":"VALS","forbindelse":"valsartan","datakort":"egne"},{"kode":"ATEN","forbindelse":"atenolol","datakort":"egne"},{"kode":"BISO","forbindelse":"bisoprolol","datakort":"egne"},{"kode":"METOP","forbindelse":"metoprolol","datakort":"egne"},{"kode":"BEND","forbindelse":"bendroflumetiazid","datakort":"egne"},{"kode":"BUME","forbindelse":"bumetanid","datakort":"egne"},{"kode":"FURO","forbindelse":"furosemid","datakort":"egne"},{"kode":"HYDR","forbindelse":"hydroklortiazid","datakort":"egne"},{"kode":"AMLO","forbindelse":"amlodipin","datakort":"egne"},{"kode":"DIL","forbindelse":"diltiazem","datakort":"egne"},{"kode":"LERK","forbindelse":"lerkanidipin","datakort":"egne"},{"kode":"NIFE","forbindelse":"nifedipin","datakort":"egne"},{"kode":"VER","forbindelse":"verapamil","datakort":"egne"},{"kode":"IRCAK","forbindelse":"thc-cooh","datakort":null},{"kode":"APR","forbindelse":"alprazolam","datakort":"egne"},{"kode":"DIAZ","forbindelse":"diazepam","datakort":"egne"},{"kode":"DMI","forbindelse":"nordiazepam","datakort":"forbindelse"},{"kode":"OXA","forbindelse":"oksazepam","datakort":"egne"},{"kode":"CZP","forbindelse":"klonazepam","datakort":"egne"},{"kode":"NIT","forbindelse":"nitrazepam","datakort":"egne"},{"kode":"ZOLP","forbindelse":"zolpidem","datakort":"egne"},{"kode":"ZOPI","forbindelse":"zopiklon","datakort":"egne"},{"kode":"THC","forbindelse":"thc","datakort":"egne"},{"kode":"BUP","forbindelse":"buprenorfin","datakort":"egne"},{"kode":"FYL","forbindelse":"fentanyl","datakort":"egne"},{"kode":"KOD","forbindelse":"kodein","datakort":"egne"},{"kode":"MOR","forbindelse":"morfin","datakort":"egne"},{"kode":"MDO","forbindelse":"metadon","datakort":"egne"},{"kode":"OKSY","forbindelse":"oksykodon","datakort":"egne"},{"kode":"TAP","forbindelse":"tapentadol","datakort":"egne"},{"kode":"TRAM","forbindelse":"tramadol","datakort":"egne"},{"kode":"OTRAM","forbindelse":"o-desmetyltramadol","datakort":"forbindelse"},{"kode":"AMF1","forbindelse":"amfetamin","datakort":"egne"},{"kode":"MAF1","forbindelse":"metamfetamin","datakort":"egne"},{"kode":"BEZ1","forbindelse":"benzoylekgonin","datakort":"egne"},{"kode":"ECS1","forbindelse":"mdma","datakort":"egne"},{"kode":"UETGS","forbindelse":"etylglukuronid","datakort":null},{"kode":"UETS","forbindelse":"etylsulfat","datakort":null}]$data$;
  data jsonb := importdata::jsonb;
  fagmiljo uuid := intern.opprinnelig_fagmiljo();
  forfatter public.profiles;
  kort record;
  utkastet jsonb;
  publisert jsonb;
  status public.objektstatus;
begin
  if md5(importdata) <> '54a4b362f8af571c70b3dd562ce16130' then
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

  perform set_config('far.revisjonskilde', 'Koblet til forbindelsen analysen måler i stedet for analyttkoden', true);

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
          and e.elementtype in ('referanseomrade', 'toksisk_omrade', 'alvorlig_intoksikasjon', 'halveringstid', 'steady_state')
          and k.forbindelse is not null
      )
    order by u.objekt_id
  loop
    if forfatter.id is null then
      select pr.* into forfatter from public.profiles pr where pr.username = 'peohol';
      if not found then
        raise exception 'Datakortene kan ikke kobles til forbindelsene: peohol finnes ikke her.';
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
    elementtype not in ('referanseomrade', 'toksisk_omrade', 'alvorlig_intoksikasjon', 'halveringstid', 'steady_state')
    or nullif(data ->> 'gjelder', '') is null
    or (char_length(data ->> 'gjelder') <= 120 and data ->> 'gjelder' ~ '^[a-z0-9][a-z0-9-]*$')
  );

comment on constraint innholdselementer_gjelder_forbindelse on public.innholdselementer is
  'Et datakort med data.gjelder gjelder en forbindelse i forbindelsesregisteret (src/data/forbindelser.ts), ikke en analyttkode. Se docs/faginnhold.md.';
