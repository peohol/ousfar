/**
 * Prosjektetiketten på PR-ene (`docs/prosjektansvar.md`): kontrollen i
 * `scripts/prosjektansvar.mjs`, arbeidsflyten som kjører den, og at
 * styringsdokumentet, PR-malen og de seks prosjektinstruksene sier det samme.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error - skriptet er vanlig JavaScript uten typer.
import { PROSJEKTETIKETTER, lesEtiketter, vurderEtiketter } from '../../scripts/prosjektansvar.mjs'

const ETIKETTER = [...(PROSJEKTETIKETTER as Map<string, string>).keys()]
const les = (sti: string) => readFileSync(new URL(`../../${sti}`, import.meta.url), 'utf8')
const vurder = (etiketter: string[]) => vurderEtiketter(etiketter) as { ok: boolean; melding: string; etikett?: string; prosjekt?: string }

describe('kontrollen av prosjektetiketten', () => {
  it('kjenner nøyaktig de tre prosjektene', () => {
    expect(Object.fromEntries(PROSJEKTETIKETTER as Map<string, string>)).toEqual({
      'ansvar:dev': 'OUSFAR Dev',
      'ansvar:fag': 'OUSFAR Fag',
      'ansvar:verktoy': 'OUSFAR Verktøy',
    })
  })

  it.each(ETIKETTER)('godtar %s alene, også ved siden av andre etiketter', (etikett) => {
    for (const etiketter of [[etikett], ['Til ChatGPT-kontroll – ikke merge', etikett, 'bug']]) {
      const v = vurder(etiketter)
      expect(v).toMatchObject({ ok: true, etikett, prosjekt: (PROSJEKTETIKETTER as Map<string, string>).get(etikett) })
      expect(v.melding).toContain(`ChatGPT-prosjektet ${v.prosjekt}`)
    }
  })

  it('avviser en PR uten prosjektetikett og sier hva som må gjøres', () => {
    for (const etiketter of [[], ['documentation', 'Til ChatGPT-kontroll – ikke merge']]) {
      const v = vurder(etiketter)
      expect(v.ok).toBe(false)
      expect(v.melding).toMatch(/^PR-en mangler prosjektetikett\./)
      expect(v.melding).toContain('ansvar:dev, ansvar:fag eller ansvar:verktoy')
      expect(v.melding).toContain('docs/prosjektansvar.md')
    }
  })

  it('avviser to eller tre prosjektetiketter og navngir dem', () => {
    const to = vurder(['ansvar:dev', 'ansvar:verktoy'])
    expect(to.ok).toBe(false)
    expect(to.melding).toContain('2 prosjektetiketter (ansvar:dev, ansvar:verktoy), men skal ha nøyaktig én')
    expect(to.melding).toContain('docs/prosjektansvar.md')
    expect(vurder(ETIKETTER)).toMatchObject({ ok: false, melding: expect.stringContaining('3 prosjektetiketter') })
  })

  it('regner en ukjent eller feilstavet ansvar-etikett som prosjektetikett, men ikke som gyldig', () => {
    expect(vurder(['ansvar:design'])).toMatchObject({ ok: false, melding: expect.stringContaining('«ansvar:design» er ikke en gyldig prosjektetikett') })
    expect(vurder(['Ansvar:Dev'])).toMatchObject({ ok: false, melding: expect.stringContaining('«Ansvar:Dev» er ikke en gyldig') })
    // Sammen med en gyldig er det to prosjektetiketter, ikke én.
    expect(vurder(['ansvar:dev', 'ansvar:design']).ok).toBe(false)
  })

  it('teller den samme etiketten bare én gang', () => {
    expect(vurder(['ansvar:fag', 'ansvar:fag']).ok).toBe(true)
  })

  it('leser etikettene slik arbeidsflyten gir dem, og feiler tydelig ellers', () => {
    expect(lesEtiketter('["ansvar:dev","bug"]')).toEqual(['ansvar:dev', 'bug'])
    expect(lesEtiketter('[]')).toEqual([])
    expect(() => lesEtiketter(undefined)).toThrow()
    expect(() => lesEtiketter('{"navn":"ansvar:dev"}')).toThrow(/JSON-liste/)
    expect(() => lesEtiketter('[{"name":"ansvar:dev"}]')).toThrow(/JSON-liste/)
  })
})

describe('arbeidsflyten', () => {
  const flyt = les('.github/workflows/prosjektansvar.yml')

  it('kjøres på nytt når etikettene endres og når PR-en får nye commits', () => {
    const typer = flyt.match(/types: \[([^\]]+)\]/)?.[1]?.split(',').map((t) => t.trim())
    expect(typer).toEqual(expect.arrayContaining(['opened', 'reopened', 'synchronize', 'labeled', 'unlabeled']))
  })

  it('heter det regelsettet krever, kjører skriptet og gir etikettene bare som miljøvariabel', () => {
    expect(flyt).toMatch(/^ {4}name: Prosjektansvar$/m)
    expect(flyt).toContain('run: node scripts/prosjektansvar.mjs')
    expect(flyt).toContain('ETIKETTER: ${{ toJSON(github.event.pull_request.labels.*.name) }}')
    expect(flyt.match(/\$\{\{/g)).toHaveLength(2) // bare ETIKETTER og concurrency-gruppen
    expect(flyt).toMatch(/permissions:\n {2}contents: read\n/)
    expect(flyt).not.toMatch(/secrets\.|pull_request_target/)
  })
})

describe('dokumentene sier det samme', () => {
  const ansvar = les('docs/prosjektansvar.md')
  const mal = les('.github/pull_request_template.md')
  const instrukser = les('docs/prosjektinstrukser.md')

  it('styringsdokumentet og PR-malen nevner alle tre etikettene', () => {
    for (const e of ETIKETTER) {
      expect(ansvar).toContain(`\`${e}\``)
      expect(mal).toContain(`\`${e}\``)
    }
    expect(mal).toMatch(/## Ansvarlig prosjekt/)
    expect(mal).toMatch(/Avhengigheter/)
    expect(mal).toMatch(/utenfor/)
  })

  it('PR-malen begynner med sammendraget for mennesker, og AGENTS.md krever det', () => {
    expect(mal.trimStart()).toMatch(/^## Sammendrag\n/)
    const sammendrag = mal.split(/^## /m)[1]!
    for (const del of ['Hva er gjort', 'Hvorfor', 'menneskelig systemarkitekt']) expect(sammendrag).toContain(del)
    expect(les('AGENTS.md')).toMatch(/Øverst står et kort sammendrag for mennesker/)
    expect(ansvar).toMatch(/øverst\s+et kort sammendrag/)
  })

  it('har seks prosjektinstrukser, én per prosjekt og agent, som hver peker til fasiten og eier riktig etikett', () => {
    const blokker = [...instrukser.matchAll(/^## (Claude|ChatGPT) – (OUSFAR \S+)\n[\s\S]*?```text\n([\s\S]*?)```/gm)]
    const navn = blokker.map((b) => `${b[1]} – ${b[2]}`)
    const prosjekter = [...(PROSJEKTETIKETTER as Map<string, string>).values()]
    expect(navn.sort()).toEqual(prosjekter.flatMap((p) => [`ChatGPT – ${p}`, `Claude – ${p}`]).sort())
    for (const [, agent, prosjekt, tekst] of blokker) {
      const egen = ETIKETTER.find((e) => (PROSJEKTETIKETTER as Map<string, string>).get(e) === prosjekt)!
      expect(tekst, `${agent} ${prosjekt}`).toContain('docs/prosjektansvar.md')
      expect(tekst, `${agent} ${prosjekt}`).toContain(`Etiketten dette prosjektet eier: ${egen}`)
      for (const annen of ETIKETTER.filter((e) => e !== egen)) expect(tekst, `${agent} ${prosjekt}`).not.toContain(`eier: ${annen}`)
      for (const del of ['ANSVAR', 'IKKE DITT ANSVAR', 'ARBEIDSDELING', 'LES', 'OPPGAVER OG PR-ER FRA ANDRE PROSJEKTER']) {
        expect(tekst, `${agent} ${prosjekt}: ${del}`).toMatch(new RegExp(`^${del}$`, 'm'))
      }
    }
  })

  it('lar ChatGPT bare kontrollere eget prosjekts PR-er, og aldri en PR uten gyldig merking', () => {
    const chatgpt = [...instrukser.matchAll(/^## ChatGPT – [\s\S]*?```text\n([\s\S]*?)```/gm)].map((b) => b[1]!)
    expect(chatgpt).toHaveLength(3)
    for (const tekst of chatgpt) {
      expect(tekst).toMatch(/bare PR-er med etiketten/)
      expect(tekst).toMatch(/uten gyldig prosjektetikett/)
      expect(tekst).toMatch(/ikke en parallell kontroll/)
    }
  })

  it('bevarer den uavhengige kontrollen av fagsidene i OUSFAR Fag', () => {
    const fag = instrukser.match(/^## Claude – OUSFAR Fag\n[\s\S]*?```text\n([\s\S]*?)```/m)?.[1] ?? ''
    expect(fag).toMatch(/Kurator og Kontrollør har aldri direkte kontakt/)
    expect(fag).toMatch(/Kontrolløren sjekker de sentrale påstandene mot kildene selv/)
    expect(fag).toMatch(/Hver tråd bruker bare sin egen nøkkel/)
    const chatgptFag = instrukser.match(/^## ChatGPT – OUSFAR Fag\n[\s\S]*?```text\n([\s\S]*?)```/m)?.[1] ?? ''
    expect(chatgptFag).toMatch(/erstatter ikke/)
  })
})
