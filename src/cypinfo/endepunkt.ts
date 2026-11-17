/**
 * Serverendepunktet `/api/cypinfo`, som synkroniserer CYPinfo-katalogen
 * (`docs/cypinfo-integrasjon.md`). Jobben i GitHub Actions kaller det hver uke
 * med `POST` og et OIDC-token for arbeidsflyten; en systemarkitekt kan be om
 * det samme med sin egen innlogging («Hent nå» i «Datakilder»).
 *
 * Endepunktet er én Vercel-funksjon for alt OUSFAR gjør mot CYPinfo, så
 * antallet funksjoner holdes nede: oppslaget i etappe C kommer i samme
 * funksjon, som en egen handling.
 */
import { kallMot } from '../legemiddeldata/lager.js'
import { erSystemarkitekt, hvem, serverklient, svar, type Arkitektsjekk, type Githubsjekk, type Miljo } from '../server/tilgang.js'
import { lagCypinfoApi, type CypinfoApi } from './api.js'
import { lagCypinfolager } from './lager.js'
import { synkroniserCypinfo, type Cypinfosynkresultat, type Cypinfosynkvalg } from './synk.js'

/** Arbeidsflyten som kjører synkroniseringen hver uke. */
export const CYPINFO_ARBEIDSFLYT = '.github/workflows/cypinfo-synk.yml'

type Synkroniser = (valg: Pick<Cypinfosynkvalg, 'lager' | 'api' | 'utlostAv'>) => Promise<Cypinfosynkresultat>

export async function behandleCypinfo(
  foresporsel: Request,
  miljo: Miljo,
  {
    synkroniser = synkroniserCypinfo,
    arkitektsjekk = erSystemarkitekt,
    githubsjekk,
    api,
  }: { synkroniser?: Synkroniser; arkitektsjekk?: Arkitektsjekk; githubsjekk?: Githubsjekk; api?: CypinfoApi } = {},
): Promise<Response> {
  if (foresporsel.method !== 'GET' && foresporsel.method !== 'POST') return svar(405, { feil: 'Bare GET og POST.' })
  const utlostAv = await hvem(foresporsel, miljo, arkitektsjekk, { arbeidsflyt: CYPINFO_ARBEIDSFLYT, sjekk: githubsjekk })
  if (!utlostAv) return svar(401, { feil: 'Ikke tilgang.' })

  const klient = serverklient(miljo)
  if (!klient) return svar(500, { feil: 'Mangler oppkoblingen mot databasen.' })

  const resultat = await synkroniser({ lager: lagCypinfolager(kallMot(klient)), api: api ?? lagCypinfoApi(), utlostAv })
  // En feilet kjøring er logget i databasen; statuskoden gjør den synlig i Vercel og GitHub også.
  return svar(resultat.status === 'feilet' ? 502 : 200, resultat)
}
