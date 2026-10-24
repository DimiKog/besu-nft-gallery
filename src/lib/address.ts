const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function isValidEthereumAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value.trim());
}

export function normalizeAddressInput(value: string): string {
  return value.trim();
}
