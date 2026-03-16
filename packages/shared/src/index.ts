export function assertUnreachable(value: never): never {
  throw new Error(`Unreachable: ${String(value)}`);
}

export * from "./xlsx-utils.js";
