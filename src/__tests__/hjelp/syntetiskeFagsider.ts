/**
 * Syntetiske fagsider i mengder, til prøvene og målingene av fagsidelesingen.
 *
 * Gir SQL som må kjøres som en administrator (rollen `authenticated` med
 * administratorens ID i JWT-kravene, se `som` i `testdatabase.ts`). Alt lages
 * gjennom de samme funksjonene appen bruker (`opprett_utkast`,
 * `publiser_utkast`, `lagre_utkast`), så tilstandene, revisjonene og
 * referansekoblingene blir som i produksjonen.
 *
 * Hver side får egne referanser, som siteres fra panelet, fra kortene og fra
 * teksten. Etter publiseringen endres en del av utkastene igjen uten å
 * publiseres, og noen objekter finnes bare som utkast, så utkastet og det
 * publiserte er forskjellige. Referansene ingen siterer, er objektutgaver
 * lesingen ikke skal ta med.
 *
 * Navnene, tekstene og tallene er syntetiske. Ingen kliniske verdier inngår.
 */
export interface SyntetiskeFagsider {
  /** Antall fagsider. */
  sider: number
  /** Elementer per side. */
  elementerPerSide: number
  /** Referanser per side, som sidens elementer siterer. */
  referanserPerSide: number
  /** Referanser ingen side siterer. */
  uvedkommendeReferanser: number
  /** Omtrent hvor mange tegn tekst hvert element har. */
  tekstlengde: number
}

/** Formen produksjonen hadde 06.11.2026 (~8 800 objektutgaver per tilstand). */
export const PRODUKSJONSFORM: SyntetiskeFagsider = {
  sider: 128,
  elementerPerSide: 33,
  referanserPerSide: 31,
  uvedkommendeReferanser: 460,
  tekstlengde: 1100,
}

/** Navnet syntetisk side nummer `i` (fra 1) får. Nøkkelen er `syntetisk-stoff-<i>`. */
export const syntetiskSidenavn = (i: number): string => `Syntetisk stoff ${String(i).padStart(4, '0')}`

export function syntetiskeFagsiderSql(form: SyntetiskeFagsider): string {
  const { sider, elementerPerSide, referanserPerSide, uvedkommendeReferanser, tekstlengde } = form
  if (referanserPerSide < 3) throw new Error('Hver side trenger minst tre referanser.')
  return /* sql */ `
do $syntetisk$
declare
  refs uuid[];
  side uuid;
  rad record;
  s record;
  n int := ${referanserPerSide};
begin
  for i in 1..${sider} loop
    refs := array(
      select (public.opprett_utkast('referanse', jsonb_build_object(
        'tittel', format('Syntetisk kilde %s.%s', i, r),
        'forfattere', 'Testesen T',
        'aar', (2000 + r % 25)::text,
        'lenke', format('https://example.org/syntetisk/%s/%s', i, r)
      ))).id
      from generate_series(1, n) r
      order by r
    );
    side := (public.opprett_utkast('infoside', jsonb_build_object(
      'navn', format('Syntetisk stoff %s', lpad(i::text, 4, '0')),
      'panelreferanser', jsonb_build_object('dosering', jsonb_build_array(refs[1]))
    ))).id;
    for j in 1..${elementerPerSide} loop
      perform public.opprett_utkast('innholdselement', jsonb_build_object(
        'infoside', side,
        'panel', 'farmakokinetikk',
        'posisjon', j - 1,
        'elementtype', 'kinetikkort',
        'data', jsonb_build_object('tittel', format('Syntetisk kort %s', j), 'dokument', jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
          jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', left(repeat(md5(format('%s.%s', i, j)) || ' ', ${tekstlengde} / 33 + 1), ${tekstlengde})),
            jsonb_build_object('type', 'sitering', 'attrs', jsonb_build_object(
              'referanser', jsonb_build_array(refs[1 + j % n], refs[1 + (j + 1) % n])
            ))
          ))
        ))),
        'referanser', jsonb_build_array(refs[1 + (j + 2) % n])
      ));
    end loop;
  end loop;

  for r in 1..${uvedkommendeReferanser} loop
    perform public.opprett_utkast('referanse', jsonb_build_object(
      'tittel', format('Usitert syntetisk kilde %s', r), 'forfattere', 'Testesen T', 'aar', '2019', 'lenke', ''
    ));
  end loop;

  -- Alt publiseres: referansene først, så sidene, så elementene.
  for rad in
    select t.objekt_id, t.revisjon
    from public.objekttilstander t
    join public.redigerbare_objekter o on o.id = t.objekt_id
    where t.tilstand = 'utkast' and o.type in ('referanse', 'infoside', 'innholdselement')
    order by case o.type when 'referanse' then 0 when 'infoside' then 1 else 2 end, o.opprettet_kl, o.id
  loop
    perform public.publiser_utkast(rad.objekt_id, rad.revisjon);
  end loop;

  -- Hvert tredje element endres i utkastet: ny tekst og en annen sitering.
  for rad in
    select u.objekt_id, u.revisjon, u.innhold, row_number() over (order by u.objekt_id) as nr
    from public.objektutgaver u
    join public.redigerbare_objekter o on o.id = u.objekt_id
    where u.tilstand = 'utkast' and o.type = 'innholdselement'
  loop
    continue when rad.nr % 3 <> 0;
    perform public.lagre_utkast(rad.objekt_id, rad.revisjon, jsonb_set(
      rad.innhold,
      '{data,dokument,content,0,content,0,text}',
      to_jsonb(format('Endret i utkastet %s', rad.nr))
    ) - 'referanser');
  end loop;

  -- Hver femte side får nytt navn og en ny referanse og et nytt element som
  -- bare finnes i utkastet.
  for s in
    select i.objekt_id, i.navn, row_number() over (order by i.navn) as nr
    from public.infosider i
    where i.tilstand = 'utkast'
  loop
    continue when s.nr % 5 <> 0;
    side := s.objekt_id;
    perform public.lagre_utkast(side, u.revisjon, u.innhold || jsonb_build_object('navn', 'Omdøpt ' || s.navn))
    from public.objektutgaver u
    where u.objekt_id = side and u.tilstand = 'utkast';
    refs := array[(public.opprett_utkast('referanse', jsonb_build_object(
      'tittel', format('Ny syntetisk kilde %s', s.nr), 'forfattere', 'Testesen T', 'aar', '2024', 'lenke', ''
    ))).id];
    perform public.opprett_utkast('innholdselement', jsonb_build_object(
      'infoside', side, 'panel', 'farmakokinetikk', 'posisjon', 1000, 'elementtype', 'kinetikkort',
      'data', jsonb_build_object('tittel', 'Bare i utkastet', 'dokument', jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
        jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', 'Bare i utkastet '),
          jsonb_build_object('type', 'sitering', 'attrs', jsonb_build_object('referanser', to_jsonb(refs)))
        ))
      )))
    ));
  end loop;
end
$syntetisk$;
`
}
