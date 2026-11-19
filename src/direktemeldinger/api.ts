/**
 * Kallene direktemeldingene gjør gjennom appens klient. Kallene selv står i
 * `kall.ts`, og dørklokken her bruker den samme som gruppechatten, på
 * `public.direktesamtaler`.
 */
import { klient } from '../auth/klient'
import { DIREKTEKILDE, lagAbonner, type Abonner } from '../gruppechat/dorklokke'
import { lagDirekteapi } from './kall'

export const direkteapi = lagDirekteapi(klient)

/** Dørklokken for én samtale, eller for alle den innloggede er med i (`null`). */
export const abonnerPaDirektesamtale: Abonner = lagAbonner(klient, DIREKTEKILDE)
