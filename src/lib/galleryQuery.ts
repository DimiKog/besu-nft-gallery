import { isValidEthereumAddress, normalizeAddressInput } from "./address";
import { resolveAddressDeepLink } from "./addressQuery";

export type GalleryDeepLinkAction =
  | { type: "none" }
  | { type: "collection"; contract: string }
  | { type: "collection-invalid"; raw: string }
  | { type: "wallet"; address: string }
  | { type: "wallet-invalid"; raw: string };

function parseSearch(search: string): URLSearchParams {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query);
}

function toSearchString(params: URLSearchParams): string {
  const encoded = params.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

/**
 * Resolve gallery deep links from a query string.
 *
 * Precedence: when both `contract` and `address` are present, `contract` wins.
 * Missing both → none. Present-but-invalid → typed invalid action (no API calls).
 */
export function resolveGalleryDeepLink(
  search: string,
): GalleryDeepLinkAction {
  const params = parseSearch(search);

  if (params.has("contract")) {
    const raw = params.get("contract") ?? "";
    const normalized = normalizeAddressInput(raw);
    if (!isValidEthereumAddress(normalized)) {
      return { type: "collection-invalid", raw };
    }
    return { type: "collection", contract: normalized };
  }

  const wallet = resolveAddressDeepLink(search);
  if (wallet.type === "none") {
    return { type: "none" };
  }
  if (wallet.type === "invalid") {
    return { type: "wallet-invalid", raw: wallet.raw };
  }
  return { type: "wallet", address: wallet.address };
}

/**
 * Build a wallet deep-link search string.
 * Sets `address`, removes `contract`, preserves unrelated params.
 */
export function buildWalletGallerySearch(
  currentSearch: string,
  address: string,
): string {
  const params = parseSearch(currentSearch);
  params.delete("contract");
  params.set("address", address);
  return toSearchString(params);
}

/**
 * Build a collection deep-link search string.
 * Sets `contract`, removes `address`, preserves unrelated params.
 */
export function buildCollectionGallerySearch(
  currentSearch: string,
  contract: string,
): string {
  const params = parseSearch(currentSearch);
  params.delete("address");
  params.set("contract", contract);
  return toSearchString(params);
}

/**
 * Clear mode-specific params (`address`, `contract`) while preserving others.
 */
export function buildHomeGallerySearch(currentSearch: string): string {
  const params = parseSearch(currentSearch);
  params.delete("address");
  params.delete("contract");
  return toSearchString(params);
}
