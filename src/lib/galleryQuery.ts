import { isValidEthereumAddress, normalizeAddressInput } from "./address";
import { resolveAddressDeepLink } from "./addressQuery";

export type GalleryDeepLinkAction =
  | { type: "discover" }
  | { type: "none" }
  | { type: "collections" }
  | { type: "collection"; contract: string }
  | { type: "collection-invalid"; raw: string }
  | { type: "wallet"; address: string }
  | { type: "wallet-invalid"; raw: string };

export type GalleryNavDestination = "discover" | "collections" | "wallet";

export type GalleryMode = "discover" | "wallet" | "collection" | "collections";

function parseSearch(search: string): URLSearchParams {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query);
}

function toSearchString(params: URLSearchParams): string {
  const encoded = params.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

function clearModeParams(params: URLSearchParams): void {
  params.delete("address");
  params.delete("contract");
  params.delete("view");
}

/**
 * Resolve gallery deep links from a query string.
 *
 * Precedence:
 * 1. `contract` present (valid or invalid) → Collection Detail / validation error
 * 2. `view=collections` → All Collections directory
 * 3. `address` → Wallet Gallery deep link
 * 4. `view=wallet` → Wallet Gallery idle
 * 5. otherwise → Discover homepage
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

  const view = params.get("view")?.trim().toLowerCase() ?? "";
  if (view === "collections") {
    return { type: "collections" };
  }

  const wallet = resolveAddressDeepLink(search);
  if (wallet.type === "invalid") {
    return { type: "wallet-invalid", raw: wallet.raw };
  }
  if (wallet.type === "load") {
    return { type: "wallet", address: wallet.address };
  }

  if (view === "wallet") {
    return { type: "none" };
  }

  return { type: "discover" };
}

/**
 * Build a wallet deep-link search string.
 * Sets `address`, removes `contract`/`view`, preserves unrelated params.
 */
export function buildWalletGallerySearch(
  currentSearch: string,
  address: string,
): string {
  const params = parseSearch(currentSearch);
  params.delete("contract");
  params.delete("view");
  params.set("address", address);
  return toSearchString(params);
}

/**
 * Build the Wallet Gallery idle search string.
 * Sets `view=wallet`, removes `address`/`contract`, preserves unrelated params.
 */
export function buildWalletViewSearch(currentSearch: string): string {
  const params = parseSearch(currentSearch);
  params.delete("address");
  params.delete("contract");
  params.set("view", "wallet");
  return toSearchString(params);
}

/**
 * Build a collection deep-link search string.
 * Sets `contract`, removes `address`/`view`, preserves unrelated params.
 */
export function buildCollectionGallerySearch(
  currentSearch: string,
  contract: string,
): string {
  const params = parseSearch(currentSearch);
  params.delete("address");
  params.delete("view");
  params.set("contract", contract);
  return toSearchString(params);
}

/**
 * Build the All Collections directory search string.
 * Sets `view=collections`, removes `address`/`contract`, preserves unrelated params.
 */
export function buildCollectionsViewSearch(currentSearch: string): string {
  const params = parseSearch(currentSearch);
  params.delete("address");
  params.delete("contract");
  params.set("view", "collections");
  return toSearchString(params);
}

/**
 * Build the Discover homepage search string.
 * Clears mode-specific params (`address`, `contract`, `view`) while preserving others.
 */
export function buildHomeGallerySearch(currentSearch: string): string {
  const params = parseSearch(currentSearch);
  clearModeParams(params);
  return toSearchString(params);
}

/** Active nav highlight for the current resolved deep link / mode. */
export function resolveActiveNav(mode: GalleryMode): GalleryNavDestination {
  if (mode === "discover") {
    return "discover";
  }
  if (mode === "collections" || mode === "collection") {
    return "collections";
  }
  return "wallet";
}

/**
 * Whether navigating to a primary-nav destination would be a no-op.
 * Skips redundant pushState when mode and URL already match the destination.
 * Collection Detail (`mode === "collection"`) is not treated as Collections.
 */
export function shouldSkipGalleryNav(input: {
  destination: GalleryNavDestination;
  mode: GalleryMode;
  currentSearch: string;
}): boolean {
  const normalizedCurrent = toSearchString(parseSearch(input.currentSearch));

  if (input.destination === "discover") {
    if (input.mode !== "discover") {
      return false;
    }
    return normalizedCurrent === buildHomeGallerySearch(input.currentSearch);
  }

  if (input.destination === "collections") {
    if (input.mode !== "collections") {
      return false;
    }
    return (
      normalizedCurrent === buildCollectionsViewSearch(input.currentSearch)
    );
  }

  if (input.mode !== "wallet") {
    return false;
  }
  return normalizedCurrent === buildWalletViewSearch(input.currentSearch);
}
