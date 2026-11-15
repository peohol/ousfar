/** Kopien eller gjenopprettingen kan ikke fortsette; meldingen sier hvorfor. */
export class Stopp extends Error {}

/** Kilden ble endret mens kopien ble tatt, på en måte øyeblikksbildet ikke dekker: forsøket tas på nytt. */
export class Endret extends Error {}
