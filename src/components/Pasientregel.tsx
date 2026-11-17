import { lignerPersonnummer, PASIENTREGEL } from '@delt/pasientopplysninger'

/**
 * Regelen om pasientopplysninger (docs/pasientopplysninger.md), kort, der
 * brukerne skriver fritekst eller deler noe med andre. Den står dempet ved
 * skrivefeltet og kan knyttes til feltet med `id` og `aria-describedby`, så
 * en skjermleser leser den sammen med feltet.
 */
export function Pasientregel({ id }: { id?: string }) {
  return (
    <p className="pasientregel" id={id}>
      {PASIENTREGEL.kort}
    </p>
  )
}

/**
 * Advarselen mens teksten ligner et fødselsnummer (`lignerPersonnummer`).
 * Den sier fra med en gang (`role="alert"`), men stopper ingenting selv:
 * databasen avviser teksten der den håndheves. Uten treff vises ingenting.
 */
export function Pasientvarsel({ tekst, id }: { tekst: string; id?: string }) {
  if (!lignerPersonnummer(tekst)) return null
  return (
    <p className="notis pasientvarsel" role="alert" id={id}>
      {PASIENTREGEL.advarsel}
    </p>
  )
}
