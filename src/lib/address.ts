const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function isValidEthereumAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value.trim());
}

export function normalizeAddressInput(value: string): string {
  return value.trim();
}

/**
 * Whether an NFT owner address is safe to use for wallet-gallery navigation.
 * Null/blank/malformed values are not navigable.
 */
export function isNavigableOwnerAddress(
  value: string | null | undefined,
): boolean {
  if (value == null) {
    return false;
  }
  return isValidEthereumAddress(normalizeAddressInput(value));
}
