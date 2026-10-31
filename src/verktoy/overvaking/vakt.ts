/**
 * Vakten over sakene fra kildeovervåkingen (P12.1,
 * `docs/verktøy-p12-overvaking.md` §5 og `docs/verktøy-p12-regelforvaltning.md`
 * §5): en daglig arbeidsflyt som ikke er avhengig av Claude, merker en åpen
 * sak som ubehandlet og nevner den ansvarlige når den mangler en teknisk
 * vurdering etter fristen, eller, med høy prioritet, en faglig beslutning.
 *
 * Vakten bare merker og kommenterer saken. Den lukker ingen sak og endrer,
 * godkjenner eller sperrer ingen regel.
 */

/** Merkelappene sakene har. */
export const MERKER = {
  sak: 'kildeovervaking',
  hoy: 'kildeovervaking-hoy',
  ubehandlet: 'kildeovervaking-ubehandlet',
} as const

/** Den faste første linjen i kommentarene som behandler en sak. */
export const BEHANDLING = { teknisk: 'Teknisk vurdering:', faglig: 'Faglig beslutning:' } as const

/** Merket i kommentaren overvåkingen skriver når funnene i saken er endret; fristene regnes fra den. */
export const ENDRET_MERKE = '<!-- kildeovervaking-endret -->'

/** Fristene i timer. Forslag til den ansvarlige; prosessfrister, ikke kliniske verdier. */
export const FRISTER = { teknisk: 24, faglig: 72 } as const

/** En sak slik `gh issue list --json number,createdAt,labels,comments` gir den. */
export interface Sak {
  number: number
  createdAt: string
  labels: { name: string }[]
  comments: { body: string; createdAt: string; authorAssociation?: string; author?: { login?: string } | null }[]
}

export interface Tiltak {
  sak: number
  leggTil: string[]
  fjern: string[]
  kommentarer: string[]
}

const BETRODD = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])
const erBetrodd = (k: Sak['comments'][number]) => BETRODD.has(k.authorAssociation ?? '')
const fraArbeidsflyten = (k: Sak['comments'][number]) => erBetrodd(k) || (k.author?.login ?? '').startsWith('github-actions')
const vaktmerke = (grunn: keyof typeof BEHANDLING) => `<!-- kildeovervaking-vakt: ${grunn} -->`

/** Hva vakten gjør med hver åpen sak `na`; ingen tiltak for en sak som er i orden. */
export function vaktTiltak(saker: readonly Sak[], na: string, ansvarlig: string, frister: { teknisk: number; faglig: number } = FRISTER): Tiltak[] {
  const naa = Date.parse(na)
  return saker.flatMap((s): Tiltak[] => {
    const merker = new Set(s.labels.map((l) => l.name))
    if (!merker.has(MERKER.sak)) return []
    // Fristene regnes fra siste gang funnene ble endret; en vurdering før det gjelder ikke de nye funnene.
    const start = Math.max(Date.parse(s.createdAt), ...s.comments.filter((k) => fraArbeidsflyten(k) && k.body.includes(ENDRET_MERKE)).map((k) => Date.parse(k.createdAt)))
    const etter = s.comments.filter((k) => Date.parse(k.createdAt) >= start)
    const har = (grunn: keyof typeof BEHANDLING) => etter.some((k) => erBetrodd(k) && k.body.trimStart().startsWith(BEHANDLING[grunn]))
    const timer = (naa - start) / 3_600_000
    const mangler = {
      teknisk: !har('teknisk') && timer >= frister.teknisk,
      faglig: merker.has(MERKER.hoy) && !har('faglig') && timer >= frister.faglig,
    }
    const ubehandlet = mangler.teknisk || mangler.faglig
    const kommentarer = (Object.keys(mangler) as (keyof typeof BEHANDLING)[])
      .filter((g) => mangler[g] && !etter.some((k) => fraArbeidsflyten(k) && k.body.includes(vaktmerke(g))))
      .map((g) =>
        [
          vaktmerke(g),
          g === 'teknisk'
            ? `@${ansvarlig} Saken har ingen teknisk vurdering ${frister.teknisk} timer etter at funnene kom. Den tekniske vurderingen skrives som en kommentar som begynner med «${BEHANDLING.teknisk}».`
            : `@${ansvarlig} Saken har høy prioritet og ingen faglig beslutning ${frister.faglig} timer etter at funnene kom. Beslutningen skrives som en kommentar som begynner med «${BEHANDLING.faglig}». Kan en plan være uforsvarlig, settes nødstoppen for de berørte reglene (\`docs/verktøy-p11-publisering.md\` §5.2).`,
        ].join('\n'),
      )
    const leggTil = ubehandlet && !merker.has(MERKER.ubehandlet) ? [MERKER.ubehandlet] : []
    const fjern = !ubehandlet && merker.has(MERKER.ubehandlet) ? [MERKER.ubehandlet] : []
    return leggTil.length + fjern.length + kommentarer.length > 0 ? [{ sak: s.number, leggTil, fjern, kommentarer }] : []
  })
}
