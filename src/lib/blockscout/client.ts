import type { NftItem } from "@/lib/nft";
import { getBlockscoutBaseUrl } from "./config";
import { mapBlockscoutNftItems } from "./mapNft";
import type { BlockscoutNftPage } from "./types";

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

export type FetchNftsByOwnerPageOptions = {
  pageParams?: BlockscoutPageParams | null;
  signal?: AbortSignal;
  /** Request timeout in milliseconds. Defaults to getBlockscoutTimeoutMs(). */
  timeoutMs?: number;
};

export type NftsByOwnerPage = {
  items: NftItem[];
  /** Cursor for the next page, or null when pagination is finished. */
  nextPageParams: BlockscoutPageParams | null;
};

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

function buildNftUrl(
  address: string,
  pageParams: BlockscoutPageParams | null,
): string {
  const url = new URL(
    `${getBlockscoutBaseUrl()}/api/v2/addresses/${encodeURIComponent(address)}/nft`,
  );
  url.searchParams.set("type", NFT_TYPES);

  if (pageParams) {
    for (const [key, value] of Object.entries(pageParams)) {
      if (value === null || value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
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
 * Fetch a single NFT ownership page from Blockscout.
 * Intended for browser-side use against the Blockscout REST API (CORS).
 */
export async function fetchNftsByOwnerPage(
  address: string,
  options: FetchNftsByOwnerPageOptions = {},
): Promise<NftsByOwnerPage> {
  const {
    pageParams = null,
    signal: externalSignal,
    timeoutMs = getBlockscoutTimeoutMs(),
  } = options;

  if (externalSignal?.aborted) {
    throw new BlockscoutApiError("Request was cancelled.", null, "aborted");
  }

  const url = buildNftUrl(address, pageParams);
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

    const page = data as BlockscoutNftPage;
    const rawItems = page.items;
    const items = mapBlockscoutNftItems(
      Array.isArray(rawItems) ? rawItems : [],
    );

    return {
      items,
      nextPageParams: normalizeNextPageParams(page.next_page_params),
    };
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}
