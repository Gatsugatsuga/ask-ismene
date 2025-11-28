import type { Abi, AbiFunction } from 'viem';

/**
 * Tente de retrouver une fonction d’écriture adaptée dans l’ABI :
 *  - noms courants: ask / submit / createRequest / createPrompt / mint
 *  - qui prend au moins 1 string
 *  - optionnellement un uint256 en 2e argument
 */
export function resolveAskFunction(abi: Abi):
  | { name: string; takesStringAndUint: boolean }
  | null {
  const candidates = ['ask', 'submit', 'createRequest', 'createPrompt', 'mint'];

  const fns = abi.filter(
    (e): e is AbiFunction => e.type === 'function' && e.stateMutability !== 'view' && e.stateMutability !== 'pure'
  );

  for (const fn of fns) {
    if (!candidates.includes(fn.name)) continue;

    const inputs = fn.inputs || [];
    // 1er arg string ?
    const firstIsString =
      inputs[0] && (inputs[0].type === 'string' || inputs[0].internalType === 'string');

    if (!firstIsString) continue;

    // 2e arg uint256 optionnel ?
    const secondIsUint =
      inputs[1] && (inputs[1].type?.startsWith('uint') || inputs[1].internalType?.startsWith('uint'));

    return { name: fn.name, takesStringAndUint: Boolean(secondIsUint) };
  }

  // fallback : on cherche n’importe quelle fn d’écriture avec 1 string
  const anyString = fns.find((fn) => {
    const inputs = fn.inputs || [];
    return inputs[0] && (inputs[0].type === 'string' || inputs[0].internalType === 'string');
  });
  if (anyString) {
    const inputs = anyString.inputs || [];
    const secondIsUint =
      inputs[1] && (inputs[1].type?.startsWith('uint') || inputs[1].internalType?.startsWith('uint'));
    return { name: anyString.name, takesStringAndUint: Boolean(secondIsUint) };
  }

  return null;
}
