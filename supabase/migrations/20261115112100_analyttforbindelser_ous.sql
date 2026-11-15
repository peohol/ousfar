-- Forbindelsene analyttkodene til OUS Klinisk farmakologi måler og datakortene
-- de bruker. Laget med analyttforbindelserSql('20261115112100_analyttforbindelser_ous.sql') i scripts/analyttforbindelser.ts;
-- testene kontrollerer at fila er lik det den gir. Faginnholdet endres ikke.
do $import$
declare
  importdata constant text := $data$[{"kode":"AMTNORSUM","forbindelse":null,"datakort":"egne"},{"kode":"CITAL","forbindelse":"citalopram","datakort":"egne"},{"kode":"DOKSUM","forbindelse":null,"datakort":"egne"},{"kode":"DULO","forbindelse":"duloksetin","datakort":"egne"},{"kode":"ESCIT","forbindelse":"escitalopram","datakort":"egne"},{"kode":"FLUOSUM","forbindelse":null,"datakort":"egne"},{"kode":"FLUV","forbindelse":"fluvoksamin","datakort":"egne"},{"kode":"HBUP","forbindelse":"hydroksybupropion","datakort":"egne"},{"kode":"KLOSUM","forbindelse":null,"datakort":"egne"},{"kode":"MIASUM","forbindelse":null,"datakort":"egne"},{"kode":"MTZ","forbindelse":"mirtazapin","datakort":"egne"},{"kode":"NOR","forbindelse":"nortriptylin","datakort":"egne"},{"kode":"PARO","forbindelse":"paroksetin","datakort":"egne"},{"kode":"SERT","forbindelse":"sertralin","datakort":"egne"},{"kode":"TRIM","forbindelse":"trimipramin","datakort":"egne"},{"kode":"VENSUM","forbindelse":null,"datakort":"egne"},{"kode":"VOR","forbindelse":"vortioksetin","datakort":"egne"},{"kode":"AMIS","forbindelse":"amisulprid","datakort":"egne"},{"kode":"ARISUM","forbindelse":null,"datakort":"egne"},{"kode":"BREK","forbindelse":"brekspiprazol","datakort":"egne"},{"kode":"FLUP","forbindelse":"flupentiksol","datakort":"egne"},{"kode":"HALO","forbindelse":"haloperidol","datakort":"egne"},{"kode":"KARSUM","forbindelse":null,"datakort":"egne"},{"kode":"KLORP","forbindelse":"klorprotiksen","datakort":"egne"},{"kode":"KLOZ","forbindelse":"klozapin","datakort":"egne"},{"kode":"KVE","forbindelse":"kvetiapin","datakort":"egne"},{"kode":"LMP","forbindelse":"levomepromazin","datakort":"egne"},{"kode":"LURA","forbindelse":"lurasidon","datakort":"egne"},{"kode":"OLAN","forbindelse":"olanzapin","datakort":"egne"},{"kode":"PALI","forbindelse":"paliperidon","datakort":"egne"},{"kode":"PERF","forbindelse":"perfenazin","datakort":"egne"},{"kode":"RISPSUM","forbindelse":null,"datakort":"egne"},{"kode":"ZIPRA","forbindelse":"ziprasidon","datakort":"egne"},{"kode":"ZUKLO","forbindelse":"zuklopentiksol","datakort":"egne"},{"kode":"LAM","forbindelse":"lamotrigin","datakort":"egne"},{"kode":"ENAT","forbindelse":"enalaprilat","datakort":"egne"},{"kode":"LISI","forbindelse":"lisinopril","datakort":"egne"},{"kode":"RAMAT","forbindelse":"ramiprilat","datakort":"egne"},{"kode":"EPLR","forbindelse":"eplerenon","datakort":"egne"},{"kode":"KANR","forbindelse":"kanrenon","datakort":"egne"},{"kode":"KARV","forbindelse":"karvedilol","datakort":"egne"},{"kode":"LABE","forbindelse":"labetalol","datakort":"egne"},{"kode":"DOKSA","forbindelse":"doksazosin","datakort":"egne"},{"kode":"IRBE","forbindelse":"irbesartan","datakort":"egne"},{"kode":"KAND","forbindelse":"kandesartan","datakort":"egne"},{"kode":"LOSYR","forbindelse":"losartansyre","datakort":"egne"},{"kode":"TELM","forbindelse":"telmisartan","datakort":"egne"},{"kode":"VALS","forbindelse":"valsartan","datakort":"egne"},{"kode":"ATEN","forbindelse":"atenolol","datakort":"egne"},{"kode":"BISO","forbindelse":"bisoprolol","datakort":"egne"},{"kode":"METOP","forbindelse":"metoprolol","datakort":"egne"},{"kode":"BEND","forbindelse":"bendroflumetiazid","datakort":"egne"},{"kode":"BUME","forbindelse":"bumetanid","datakort":"egne"},{"kode":"FURO","forbindelse":"furosemid","datakort":"egne"},{"kode":"HYDR","forbindelse":"hydroklortiazid","datakort":"egne"},{"kode":"AMLO","forbindelse":"amlodipin","datakort":"egne"},{"kode":"DIL","forbindelse":"diltiazem","datakort":"egne"},{"kode":"LERK","forbindelse":"lerkanidipin","datakort":"egne"},{"kode":"NIFE","forbindelse":"nifedipin","datakort":"egne"},{"kode":"VER","forbindelse":"verapamil","datakort":"egne"},{"kode":"IRCAK","forbindelse":"thc-cooh","datakort":null},{"kode":"APR","forbindelse":"alprazolam","datakort":"egne"},{"kode":"DIAZ","forbindelse":"diazepam","datakort":"egne"},{"kode":"DMI","forbindelse":"nordiazepam","datakort":"forbindelse"},{"kode":"OXA","forbindelse":"oksazepam","datakort":"egne"},{"kode":"CZP","forbindelse":"klonazepam","datakort":"egne"},{"kode":"NIT","forbindelse":"nitrazepam","datakort":"egne"},{"kode":"ZOLP","forbindelse":"zolpidem","datakort":"egne"},{"kode":"ZOPI","forbindelse":"zopiklon","datakort":"egne"},{"kode":"THC","forbindelse":"thc","datakort":"egne"},{"kode":"BUP","forbindelse":"buprenorfin","datakort":"egne"},{"kode":"FYL","forbindelse":"fentanyl","datakort":"egne"},{"kode":"KOD","forbindelse":"kodein","datakort":"egne"},{"kode":"MOR","forbindelse":"morfin","datakort":"egne"},{"kode":"MDO","forbindelse":"metadon","datakort":"egne"},{"kode":"OKSY","forbindelse":"oksykodon","datakort":"egne"},{"kode":"TAP","forbindelse":"tapentadol","datakort":"egne"},{"kode":"TRAM","forbindelse":"tramadol","datakort":"egne"},{"kode":"OTRAM","forbindelse":"o-desmetyltramadol","datakort":"forbindelse"},{"kode":"AMF1","forbindelse":"amfetamin","datakort":"egne"},{"kode":"MAF1","forbindelse":"metamfetamin","datakort":"egne"},{"kode":"BEZ1","forbindelse":"benzoylekgonin","datakort":"egne"},{"kode":"ECS1","forbindelse":"mdma","datakort":"egne"},{"kode":"UETGS","forbindelse":"etylglukuronid","datakort":null},{"kode":"UETS","forbindelse":"etylsulfat","datakort":null}]$data$;
  data jsonb := importdata::jsonb;
begin
  if md5(importdata) <> '54a4b362f8af571c70b3dd562ce16130' then
    raise exception 'Importdataene er ikke de som ble laget: kontrollsummen stemmer ikke.';
  end if;

  update public.analyttkatalog_koder k
  set forbindelse = d ->> 'forbindelse', datakort = d ->> 'datakort'
  from jsonb_array_elements(data) as x(d)
  where k.fagmiljo_id = intern.opprinnelig_fagmiljo() and k.kode = d ->> 'kode'
    and (k.forbindelse, k.datakort) is distinct from (d ->> 'forbindelse', d ->> 'datakort');
end
$import$;

-- Katalogen som i P4c, med forbindelsen og datakortene til hver kode. Her og
-- ikke i forrige migrasjon: appen bruker feltene først når verdiene er satt.
create or replace function public.les_analyttkatalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  return (
  with kontekst as (
    select f.id, f.navn
    from public.fagmiljoer f
    where intern.har_aktivt_medlemskap((select auth.uid()))
      and f.id = intern.arbeidsfagmiljo((select auth.uid()))
  )
  select jsonb_build_object(
    'fagmiljo', (select jsonb_build_object('id', k.id, 'navn', k.navn) from kontekst k),
    'metoder', coalesce((
      select jsonb_agg(jsonb_build_object('kode', m.kode, 'beskrivelse', m.beskrivelse) order by m.posisjon)
      from public.analyttkatalog_metoder m
      where m.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
    'oppforinger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nokkel', o.nokkel,
        'type', o.type,
        'navn', o.navn,
        'visningsnavn', o.visningsnavn,
        'undertittel', o.undertittel,
        'komponenter', to_jsonb(o.komponenter),
        'gruppe', o.gruppe,
        'analysemetode', o.analysemetode,
        'kategori', o.kategori,
        'enhet', o.enhet,
        'maleomrade', o.maleomrade,
        'antihypertensiv', o.antihypertensiv,
        'aliaser', to_jsonb(o.aliaser),
        'koder', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kode', k.kode, 'navn', k.navn, 'forbindelse', k.forbindelse, 'datakort', k.datakort
          ) order by k.posisjon)
          from public.analyttkatalog_koder k
          where k.fagmiljo_id = o.fagmiljo_id and k.nokkel = o.nokkel
        ), '[]'::jsonb)
      ) order by o.posisjon)
      from public.analyttkatalog_oppforinger o
      where o.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
    'koblinger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kode', k.kode, 'stoff', k.stoff, 'relasjon', k.relasjon, 'primar', k.primar, 'merknad', k.merknad
      ) order by k.posisjon)
      from public.analyttkatalog_koblinger k
      where k.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb)
  )
  );
end;
$$;
