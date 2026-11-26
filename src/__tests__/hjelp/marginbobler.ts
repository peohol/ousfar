/**
 * Snakkeboblene ved sikkerhetsmarginen (#588), slik skjermen viser dem: hvilken
 * side av bryteren de står på, merket på marginen de peker på, og linjene. Og
 * hele setningene skjermlesere får som beskrivelse av bryteren.
 */
export interface VistBoble {
  side: 'over' | 'under'
  margin: string
  linjer: string[]
}

export function marginbobler(rot: ParentNode = document): VistBoble[] {
  return [...rot.querySelectorAll<HTMLElement>('.be-marginboble')].map((boble) => {
    const bryter = boble.closest('.be-margin__bryter')!
    const merker = [...bryter.querySelectorAll('.trinnbryter__valg')].map((v) => v.textContent ?? '')
    return {
      side: boble.closest('.be-margin__bobler--over') ? 'over' : 'under',
      margin: merker[Number(boble.dataset.valg)] ?? '?',
      linjer: [...boble.querySelectorAll('.be-marginboble__linje')].map((l) => l.textContent ?? ''),
    }
  })
}

export function marginbeskrivelse(rot: ParentNode = document): string[] {
  const id = rot.querySelector('.trinnbryter__felt')?.getAttribute('aria-describedby')
  if (!id) return []
  return [...(document.getElementById(id)?.querySelectorAll('p') ?? [])].map((p) => p.textContent ?? '')
}
