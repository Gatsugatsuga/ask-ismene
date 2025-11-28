import type { Abi, AbiFunction } from "viem";

type AskFunctionMeta = {
  name: string;
  takesStringAndUint: boolean;
};

function isAbiFunction(item: unknown): item is AbiFunction {
  if (!item || typeof item !== "object") return false;
  const f = item as Partial<AbiFunction>;
  return f.type === "function" && typeof f.name === "string";
}

export function resolveAskFunction(abi: Abi): AskFunctionMeta | null {
  const functions = (abi as readonly unknown[]).filter(isAbiFunction);

  const candidate = functions.find((fn) => {
    if (!fn.inputs || fn.inputs.length === 0) return false;

    const nameOk = ["ask", "submit", "mint", "createAsk"].includes(fn.name);
    const firstIsString =
      fn.inputs[0]?.type === "string" || fn.inputs[0]?.type === "string memory";

    return nameOk && firstIsString;
  });

  if (!candidate) return null;

  const takesStringAndUint =
    candidate.inputs.length >= 2 &&
    (candidate.inputs[1]?.type === "uint256" ||
      candidate.inputs[1]?.type === "uint256[]");

  return {
    name: candidate.name,
    takesStringAndUint,
  };
}
