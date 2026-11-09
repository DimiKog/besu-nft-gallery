import { isValidEthereumAddress, normalizeAddressInput } from "@/lib/address";
import type {
  CollectionDetails,
  CollectionSummary,
  CollectionTokenTypeFilter,
  PaginatedResult,
} from "@/lib/collection";
import type { NftItem } from "@/lib/nft";
import { getBlockscoutBaseUrl } from "./config";
import { mapBlockscoutCollection, mapBlockscoutCollections } from "./mapCollection";
import { mapBlockscoutNftItem, mapBlockscoutNftItems } from "./mapNft";
import type {
  BlockscoutNftItem,
  BlockscoutNftPage,
  BlockscoutTokenCollection,
  BlockscoutTokenCollectionPage,
} from "./types";

export { getBlockscoutBaseUrl } from "./config";

const NFT_TYPES = "ERC-721,ERC-1155";

/** Default Blockscout request timeout (ms). Override with options or env. */
export const DEFAULT_BLOCKSCOUT_TIMEOUT_MS = 15_000;

export type BlockscoutPageParams = Record<string, string | number | null>;

export type BlockscoutErrorCode =
  | "http"
  | "network"
  | "invalid"
  | "timeout"
  | "aborted";

export type BlockscoutRequestOptions = {
  signal?: AbortSignal;
  /** Request timeout in milliseconds. Defaults to getBlockscoutTimeoutMs(). */
  timeoutMs?: number;
};

export type BlockscoutPageOptions = BlockscoutRequestOptions & {
  pageParams?: BlockscoutPageParams | null;
};

export type FetchNftsByOwnerPageOptions = BlockscoutPageOptions;

export type NftsByOwnerPage = PaginatedResult<NftItem>;

export type CollectionsPage = PaginatedResult<CollectionSummary>;

export type CollectionInstancesPage = PaginatedResult<NftItem>;

export class BlockscoutApiError extends Error {
  readonly status: number | null;
  readonly code: BlockscoutErrorCode;

  constructor(
    message: string,
    status: number | null = null,
    code: BlockscoutErrorCode = status != null ? "http" : "network",
  ) {
    super(message);
    this.name = "BlockscoutApiError";
    this.status = status;
    this.code = code;
  }
}

/** True when the error is a user/unmount abort (not a timeout). */
export function isBlockscoutAbortError(error: unknown): boolean {
  return error instanceof BlockscoutApiError && error.code === "aborted";
}

export function getBlockscoutTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_BLOCKSCOUT_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_BLOCKSCOUT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BLOCKSCOUT_TIMEOUT_MS;
  }
  return Math.floor(parsed);
}

/**
 * Normalize Blockscout `next_page_params` into a usable cursor.
 * Malformed or empty values become null (end of pagination).
 */
export function normalizeNextPageParams(
  raw: unknown,
): BlockscoutPageParams | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const normalized: BlockscoutPageParams = {};
  for (const [key, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (value === null) {
      normalized[key] = null;
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) {
        continue;
      }
      normalized[key] = value;
      continue;
    }
    // Skip unexpected value types (objects, booleans, etc.).
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

/** Whether a Load More action should start. */
export function shouldFetchNextPage(
  nextPageParams: BlockscoutPageParams | null,
  isLoading: boolean,
): boolean {
  return nextPageParams != null && !isLoading;
}

function applyPageParams(
  url: URL,
  pageParams: BlockscoutPageParams | null,
): void {
  if (!pageParams) {
    return;
  }
  for (const [key, value] of Object.entries(pageParams)) {
    if (value === null || value === undefined) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

function buildNftUrl(
  address: string,
  pageParams: BlockscoutPageParams | null,
): string {
  const url = new URL(
    `${getBlockscoutBaseUrl()}/api/v2/addresses/${encodeURIComponent(address)}/nft`,
  );
  // Apply cursor first, then fixed filters so pagination cannot override type.
  applyPageParams(url, pageParams);
  url.searchParams.set("type", NFT_TYPES);
  return url.toString();
}

function buildCollectionsUrl(
  type: CollectionTokenTypeFilter,
  pageParams: BlockscoutPageParams | null,
): string {
  const url = new URL(`${getBlockscoutBaseUrl()}/api/v2/tokens`);
  // Apply cursor first, then fixed filters so pagination cannot override type.
  applyPageParams(url, pageParams);
  url.searchParams.set("type", type);
  return url.toString();
}

function buildCollectionDetailsUrl(address: string): string {
  return `${getBlockscoutBaseUrl()}/api/v2/tokens/${encodeURIComponent(address)}`;
}

function buildCollectionInstancesUrl(
  address: string,
  pageParams: BlockscoutPageParams | null,
): string {
  const url = new URL(
    `${getBlockscoutBaseUrl()}/api/v2/tokens/${encodeURIComponent(address)}/instances`,
  );
  applyPageParams(url, pageParams);
  return url.toString();
}

function buildCollectionInstanceUrl(
  address: string,
  tokenId: string,
): string {
  return `${getBlockscoutBaseUrl()}/api/v2/tokens/${encodeURIComponent(address)}/instances/${encodeURIComponent(tokenId)}`;
}

function requireContractAddress(address: string): string {
  const normalized = normalizeAddressInput(address);
  if (!isValidEthereumAddress(normalized)) {
    throw new BlockscoutApiError(
      "Invalid contract address.",
      null,
      "invalid",
    );
  }
  return normalized;
}

function requireTokenId(tokenId: string): string {
  if (typeof tokenId !== "string") {
    throw new BlockscoutApiError("Invalid token ID.", null, "invalid");
  }
  const trimmed = tokenId.trim();
  if (!trimmed) {
    throw new BlockscoutApiError("Invalid token ID.", null, "invalid");
  }
  return trimmed;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

type TimeoutMarker = { readonly timedOut: true };

function createTimeoutMarker(): TimeoutMarker {
  return { timedOut: true };
}

function isTimeoutMarker(reason: unknown): reason is TimeoutMarker {
  return (
    typeof reason === "object" &&
    reason != null &&
    "timedOut" in reason &&
    (reason as TimeoutMarker).timedOut === true
  );
}

function classifyFetchFailure(
  error: unknown,
  controller: AbortController,
  externalSignal: AbortSignal | undefined,
): BlockscoutApiError {
  if (error instanceof BlockscoutApiError) {
    return error;
  }

  if (isTimeoutMarker(controller.signal.reason) || isTimeoutMarker(error)) {
    return new BlockscoutApiError(
      "Blockscout API request timed out. Please try again.",
      null,
      "timeout",
    );
  }

  if (
    externalSignal?.aborted ||
    (isAbortError(error) && !isTimeoutMarker(controller.signal.reason))
  ) {
    return new BlockscoutApiError("Request was cancelled.", null, "aborted");
  }

  return new BlockscoutApiError(
    "Unable to reach the Blockscout API. Check your network connection and try again.",
    null,
    "network",
  );
}

/**
 * Shared Blockscout GET → JSON object helper.
 * Preserves timeout vs abort vs HTTP vs invalid distinctions.
 */
async function fetchBlockscoutJson(
  url: string,
  options: BlockscoutRequestOptions = {},
): Promise<Record<string, unknown>> {
  const {
    signal: externalSignal,
    timeoutMs = getBlockscoutTimeoutMs(),
  } = options;

  if (externalSignal?.aborted) {
    throw new BlockscoutApiError("Request was cancelled.", null, "aborted");
  }

  const controller = new AbortController();
  const timeoutMarker = createTimeoutMarker();

  const onExternalAbort = () => {
    controller.abort(
      externalSignal?.reason !== undefined
        ? externalSignal.reason
        : undefined,
    );
  };

  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort(timeoutMarker);
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      throw classifyFetchFailure(error, controller, externalSignal);
    }

    if (!response.ok) {
      throw new BlockscoutApiError(
        `Blockscout API request failed (${response.status}).`,
        response.status,
        "http",
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      if (isTimeoutMarker(controller.signal.reason) || isTimeoutMarker(error)) {
        throw new BlockscoutApiError(
          "Blockscout API request timed out. Please try again.",
          null,
          "timeout",
        );
      }
      if (externalSignal?.aborted) {
        throw new BlockscoutApiError("Request was cancelled.", null, "aborted");
      }
      if (isAbortError(error)) {
        throw new BlockscoutApiError("Request was cancelled.", null, "aborted");
      }
      throw new BlockscoutApiError(
        "Blockscout API returned invalid JSON.",
        null,
        "invalid",
      );
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new BlockscoutApiError(
        "Blockscout API returned an unexpected payload.",
        null,
        "invalid",
      );
    }

    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

/**
 * Fetch a single NFT ownership page from Blockscout.
 * Intended for browser-side use against the Blockscout REST API (CORS).
 */
export async function fetchNftsByOwnerPage(
  address: string,
  options: FetchNftsByOwnerPageOptions = {},
): Promise<NftsByOwnerPage> {
  const { pageParams = null, signal, timeoutMs } = options;
  const url = buildNftUrl(address, pageParams);
  const data = await fetchBlockscoutJson(url, { signal, timeoutMs });
  const page = data as BlockscoutNftPage;
  const rawItems = page.items;

  return {
    items: mapBlockscoutNftItems(Array.isArray(rawItems) ? rawItems : []),
    nextPageParams: normalizeNextPageParams(page.next_page_params),
  };
}

/**
 * List NFT collections (ERC-721 or ERC-1155) from Blockscout.
 * Preserves `next_page_params` for incremental pagination.
 */
export async function fetchNftCollectionsPage(
  type: CollectionTokenTypeFilter,
  options: BlockscoutPageOptions = {},
): Promise<CollectionsPage> {
  const { pageParams = null, signal, timeoutMs } = options;
  const url = buildCollectionsUrl(type, pageParams);
  const data = await fetchBlockscoutJson(url, { signal, timeoutMs });
  const page = data as BlockscoutTokenCollectionPage;
  const rawItems = page.items;

  return {
    items: mapBlockscoutCollections(Array.isArray(rawItems) ? rawItems : []),
    nextPageParams: normalizeNextPageParams(page.next_page_params),
  };
}

/**
 * Fetch normalized details for a single NFT collection contract.
 */
export async function fetchCollectionDetails(
  contractAddress: string,
  options: BlockscoutRequestOptions = {},
): Promise<CollectionDetails> {
  const address = requireContractAddress(contractAddress);
  const url = buildCollectionDetailsUrl(address);
  const data = await fetchBlockscoutJson(url, options);
  const collection = mapBlockscoutCollection(
    data as BlockscoutTokenCollection,
  );

  if (!collection) {
    throw new BlockscoutApiError(
      "Blockscout API returned an unusable collection payload.",
      null,
      "invalid",
    );
  }

  return collection;
}

/**
 * Fetch one page of NFT instances for a collection contract.
 * Instances are normalized to the shared `NftItem` model.
 */
export async function fetchCollectionInstancesPage(
  contractAddress: string,
  options: BlockscoutPageOptions = {},
): Promise<CollectionInstancesPage> {
  const address = requireContractAddress(contractAddress);
  const { pageParams = null, signal, timeoutMs } = options;
  const url = buildCollectionInstancesUrl(address, pageParams);
  const data = await fetchBlockscoutJson(url, { signal, timeoutMs });
  const page = data as BlockscoutNftPage;
  const rawItems = page.items;

  return {
    items: mapBlockscoutNftItems(Array.isArray(rawItems) ? rawItems : [], {
      fallbackContractAddress: address,
    }),
    nextPageParams: normalizeNextPageParams(page.next_page_params),
  };
}

/**
 * Fetch a single NFT instance by contract address and token ID (string).
 */
export async function fetchCollectionInstance(
  contractAddress: string,
  tokenId: string,
  options: BlockscoutRequestOptions = {},
): Promise<NftItem> {
  const address = requireContractAddress(contractAddress);
  const id = requireTokenId(tokenId);
  const url = buildCollectionInstanceUrl(address, id);
  const data = await fetchBlockscoutJson(url, options);
  const nft = mapBlockscoutNftItem(data as BlockscoutNftItem, {
    fallbackContractAddress: address,
  });

  if (!nft) {
    throw new BlockscoutApiError(
      "Blockscout API returned an unusable NFT instance payload.",
      null,
      "invalid",
    );
  }

  return nft;
}
