-- Personalkalenderen P2b, del 1: Sandkasse til utprøving (#616,
-- docs/personal.md §8.3, docs/personal-database.md).
--
-- Sandkasse er testmiljøet (#598). Her får den det systemarkitektene trenger
-- for å prøve kalenderen, og bare oppdiktede data:
--
-- - pilotoppsettet (`defaultRuleSet()` i supabase/functions/_delt/personal/
--   catalog.ts, som en test holder lik teksten under), med rollevektene for
--   vakt 1 og vakt 2 på stillingene LIS og Overlege i stillingslista;
-- - de tolv syntetiske medarbeiderne fra prototypen, med oppdiktede navn,
--   stillingene LIS og Overlege og kvalifikasjonene for vakt 1 og vakt 2;
-- - funksjonen `personal` på `utprøving`, slik at bare systemarkitekter som
--   selv er medlemmer av Sandkasse, har den (§8.3, «Gangen»).
--
-- Ingen innlogget konto blir medarbeider her (K-SKJ-9), og ingen godkjenning
-- for ordinær bruk opprettes: alle virkelige fagmiljøer står av.
--
-- Bare i produksjonen: uten et aktivt Sandkasse merket som testmiljø gjør den
-- ingenting, slik den gjør i en ny database. `src/__tests__/personal/
-- grunnmur.test.ts` kjører den mot et syntetisk Sandkasse. Den tåler å kjøres
-- når noe av dette alt finnes, og lager da bare det som mangler.
--
-- Tilbakeføring: slå av funksjonen i Sandkasse i appen (Administrasjon →
-- Funksjoner). Medarbeiderne er syntetiske og kan fjernes med en ny migrasjon.

do $$
declare
  sandkasse uuid;
  lis uuid;
  overlege uuid;
  pilot constant jsonb := $pilot$
{
  "groups": [
    {
      "id": "tilstede",
      "name": "Til stede"
    },
    {
      "id": "annetsted",
      "name": "Jobber et annet sted"
    },
    {
      "id": "fravaer",
      "name": "Fraværende"
    }
  ],
  "statuses": [
    {
      "uniquePerDay": true,
      "requiresQualification": true,
      "active": true,
      "id": "vakt1",
      "name": "Vakt 1",
      "group": "tilstede",
      "present": true,
      "highlighted": true,
      "icon": "shield",
      "tone": "green",
      "description": "Førstevakt."
    },
    {
      "uniquePerDay": true,
      "requiresQualification": true,
      "active": true,
      "id": "vakt2",
      "name": "Vakt 2",
      "group": "tilstede",
      "present": true,
      "highlighted": true,
      "icon": "shield",
      "tone": "blue",
      "description": "Andrevakt."
    },
    {
      "uniquePerDay": true,
      "requiresQualification": false,
      "active": true,
      "id": "referent",
      "name": "Referent",
      "group": "tilstede",
      "present": true,
      "highlighted": true,
      "icon": "pencil",
      "tone": "violet"
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "opplaering",
      "name": "Opplæring",
      "group": "tilstede",
      "present": true,
      "icon": "bulb",
      "tone": "teal",
      "dutyExemption": "always",
      "description": "Gir vaktfritak: ingen forventede vakter disse dagene."
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "hjemmekontor",
      "name": "Hjemmekontor",
      "group": "annetsted",
      "present": false,
      "icon": "house",
      "tone": "slate"
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "forskning",
      "name": "Forskning",
      "group": "annetsted",
      "present": false,
      "icon": "microscope",
      "tone": "rose"
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "undervisning",
      "name": "Undervisning",
      "group": "annetsted",
      "present": false,
      "icon": "cap",
      "tone": "sky"
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "borte",
      "name": "Borte",
      "group": "fravaer",
      "present": false,
      "icon": "cross",
      "tone": "red",
      "dutyExemption": "administrative",
      "description": "Ikke til stede, også ordinære arbeidsfrie dager ved deltid. Ingen grunn registreres. En administrator kan innvilge vaktfritak."
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "ferie",
      "name": "Ferie",
      "group": "fravaer",
      "present": false,
      "icon": "sun",
      "tone": "gold",
      "dutyExemption": "always",
      "description": "Faktisk ferie, også ulønnet ferie. Gir vaktfritak: ingen forventede vakter disse dagene."
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "avspasering",
      "name": "Avspasering",
      "group": "fravaer",
      "present": false,
      "icon": "clock",
      "tone": "amber"
    },
    {
      "uniquePerDay": false,
      "requiresQualification": false,
      "active": true,
      "id": "onske-fri",
      "name": "Ønske om fri",
      "group": "fravaer",
      "present": false,
      "icon": "question",
      "tone": "gold",
      "wish": true,
      "description": "Regnes som fravær i vaktfordelingen, men vises annerledes enn registrert fravær."
    }
  ],
  "workCalendar": {
    "weekdays": [
      true,
      true,
      true,
      true,
      true,
      false,
      false
    ],
    "holidays": false
  },
  "staffing": [
    {
      "statusId": "vakt1",
      "perWeekday": [
        1,
        1,
        1,
        1,
        1,
        0,
        0
      ],
      "onHolidays": false,
      "categoryWeights": {
        "lis": 2,
        "overlege": 1
      },
      "load": 1.5
    },
    {
      "statusId": "vakt2",
      "perWeekday": [
        1,
        1,
        1,
        1,
        1,
        0,
        0
      ],
      "onHolidays": false,
      "categoryWeights": {
        "lis": 1,
        "overlege": 2
      },
      "load": 1
    }
  ]
}
$pilot$;
  regler jsonb;
  -- Navn, stilling og kvalifikasjoner, som i prototypens eksempeldata (seed.ts).
  medarbeidere constant jsonb := '[
    ["Alma Berg", "lis", ["vakt1", "vakt2"]],
    ["Jonas Vik", "lis", ["vakt1", "vakt2"]],
    ["Sanna Myhre", "lis", ["vakt1", "vakt2"]],
    ["Emil Østby", "lis", ["vakt1", "vakt2"]],
    ["Noor Aasen", "lis", ["vakt1", "vakt2"]],
    ["Tobias Lunde", "lis", ["vakt1"]],
    ["Ida Strand", "lis", []],
    ["Maja Holte", "overlege", ["vakt1", "vakt2"]],
    ["Fredrik Solvik", "overlege", ["vakt1", "vakt2"]],
    ["Ingrid Falk", "overlege", ["vakt1", "vakt2"]],
    ["Henrik Dahl", "overlege", ["vakt1", "vakt2"]],
    ["Live Rønning", "overlege", ["vakt2"]]
  ]';
  fra constant date := '2026-01-01';
  m jsonb;
  ny uuid;
begin
  select f.id into sandkasse from public.fagmiljoer f
  where f.nokkel = 'sandkasse' and f.status = 'aktiv' and f.testmiljo and not f.standard;
  if sandkasse is null then
    return;
  end if;
  perform set_config('ousfar.tilgangsgrunn', '#616: Sandkasse til utprøving av personalkalenderen med syntetiske medarbeidere', true);

  select s.id into lis from public.stillinger s where lower(s.navn) = 'lis';
  select s.id into overlege from public.stillinger s where lower(s.navn) = 'overlege';

  -- Rollevektene gjelder stillingene i appen (1:1, §7.4). En stilling som ikke
  -- finnes, utelates; den teller da 1.
  regler := jsonb_set(pilot, '{staffing}', (
    select jsonb_agg(b || jsonb_build_object('categoryWeights', coalesce((
      select jsonb_object_agg((case w.key when 'lis' then lis when 'overlege' then overlege end)::text, w.value)
      from jsonb_each(b -> 'categoryWeights') w
      where case w.key when 'lis' then lis when 'overlege' then overlege end is not null
    ), '{}'::jsonb)) order by n)
    from jsonb_array_elements(pilot -> 'staffing') with ordinality e(b, n)
  ));

  if not exists (select 1 from personal.oppsett o where o.fagmiljo_id = sandkasse) then
    insert into personal.oppsett (fagmiljo_id, versjon, gjelder_fra, tidssone, arbeidsaar_start, skjul_helg, regler)
    values (sandkasse, 1, '2000-01-01', 'Europe/Oslo', 1, false, regler);
  end if;

  if not exists (select 1 from personal.medarbeidere x where x.fagmiljo_id = sandkasse) then
    for m in select value from jsonb_array_elements(medarbeidere) loop
      insert into personal.medarbeidere (fagmiljo_id, syntetisk_navn, syntetisk_stilling_id, aktiv_fra)
      values (sandkasse, m ->> 0, case m ->> 1 when 'lis' then lis else overlege end, fra)
      returning id into ny;
      insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra)
      select ny, q, fra from jsonb_array_elements_text(m -> 2) q;
    end loop;
  end if;

  insert into public.funksjonsbrytere (funksjon, fagmiljo_id, tilstand)
  values ('personal', sandkasse, 'utprøving')
  on conflict on constraint funksjonsbrytere_pkey do update set tilstand = excluded.tilstand, endret_kl = now()
  where public.funksjonsbrytere.tilstand = 'av';
end;
$$;
