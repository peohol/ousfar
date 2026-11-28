/** Kopien eller gjenopprettingen kan ikke fortsette; meldingen sier hvorfor. */
export class Stopp extends Error {}

/** En stopp med en melding av bare faste tekster, tall og navn i lageret: den kan stå i den offentlige loggen (`logg.ts`). */
export class OffentligStopp extends Stopp {}

/** Kilden ble endret mens kopien ble tatt, på en måte øyeblikksbildet ikke dekker: forsøket tas på nytt. */
export class Endret extends Error {}
