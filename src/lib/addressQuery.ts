import { isValidEthereumAddress, normalizeAddressInput } from "./address";

export type AddressDeepLinkAction =
  | { type: "none" }
  | { type: "invalid"; raw: string }
  | { type: "load"; address: string };

/**
 * Resolve `?address=` from a query string for wallet deep links.
 * Missing parameter → none. Present but invalid → invalid. Valid → load.
 */
export function resolveAddressDeepLink(
  search: string,
): AddressDeepLinkAction {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);

  if (!params.has("address")) {
    return { type: "none" };
  }

  const raw = params.get("address") ?? "";
  const normalized = normalizeAddressInput(raw);

  if (!isValidEthereumAddress(normalized)) {
    return { type: "invalid", raw };
  }

  return { type: "load", address: normalized };
}

/**
 * Manual wallet search always wins over deep-link bootstrap once initiated.
 */
export function shouldApplyDeepLinkBootstrap(
  userHasInitiatedSearch: boolean,
): boolean {
  return !userHasInitiatedSearch;
}
