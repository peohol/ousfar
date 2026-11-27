import { lignerPersonnummer } from '../pasientopplysninger.ts';

/**
 * Personvern i merknadsfeltet (docs/personal.md §3.2, A-MRK-01–02).
 *
 * Merknader skal bare inneholde ikke-sensitiv planleggingsinformasjon. Tekst
 * som ligner et fødselsnummer avvises, med OUSFARs felles gjenkjenning
 * (`lignerPersonnummer`, den samme som databasen bruker) og i tillegg
 * prototypens bredere vern mot alle 11 sammenhengende sifre. Det samme gjør
 * ord som typisk avslører fraværsgrunn eller helse; ordlisten er et ekstra
 * vern, ikke en garanti.
 */

export const NOTE_MAX_LENGTH = 120;

const FNR_LIKE = /(?<!\d)\d{6}[\s.-]?\d{5}(?!\d)/;

/** Ordstammer som typisk avslører fraværsgrunn eller helse (hele ord, ikke deler av ord). */
const SENSITIVE = /(?<![\p{L}])(syk\p{L}*|\p{L}+syk(?:e|dom)\p{L}*|influensa|forkjøl\p{L}*|feber|korona|covid\p{L}*|diagnos\p{L}*|lege(time|besøk)?|operasjon\p{L}*|gravid\p{L}*|svangerskap\p{L}*|begravelse\p{L}*|psyk\p{L}*|innlagt|kreft\p{L}*|depresj\p{L}*|behandling\p{L}*|terapi\p{L}*)(?![\p{L}])/iu;

export interface NoteCheck {
  ok: boolean;
  error?: string;
  value: string;
}

export function checkNote(raw: string | undefined): NoteCheck {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return { ok: true, value: '' };
  if (value.length > NOTE_MAX_LENGTH) {
    return { ok: false, value, error: `Merknaden kan være høyst ${NOTE_MAX_LENGTH} tegn.` };
  }
  if (lignerPersonnummer(value) || FNR_LIKE.test(value)) {
    return { ok: false, value, error: 'Merknaden ligner et fødselsnummer og kan ikke lagres.' };
  }
  if (SENSITIVE.test(value)) {
    return {
      ok: false,
      value,
      error: 'Merknaden ser ut til å beskrive fraværsgrunn eller helse. Skriv bare praktisk planleggingsinformasjon.',
    };
  }
  return { ok: true, value };
}
