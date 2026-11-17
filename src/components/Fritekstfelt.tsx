import { usePasientvakt } from '../hooks/usePasientvakt'
import { Felt, type FeltProps } from './konto/Felt'

/**
 * Et `Felt` for tekst som deles med andre, som overskrifter og navn: advarer
 * mens teksten ligner et fødselsnummer, uten å gjenta regelen, som står ved
 * hovedteksten i det samme skjemaet (`docs/pasientopplysninger.md`).
 */
export function Fritekstfelt(props: Omit<FeltProps, 'vakt'>) {
  const vakt = usePasientvakt(String(props.value ?? ''), 'varsel')
  return <Felt {...props} vakt={vakt} />
}
