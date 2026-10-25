import type { NftItem } from "@/lib/nft";
import { getBlockscoutBaseUrl } from "./config";
import { mapBlockscoutNftItems } from "./mapNft";
import type { BlockscoutNftPage } from "./types";

export { getBlockscoutBaseUrl } from "./config";

const NFT_TYPES = "ERC-721,ERC-1155";

export class BlockscoutApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "BlockscoutApiError";
    this.status = status;
  }
}

function buildNftUrl(
  address: string,
  pageParams: Record<string, string | number | null> | null,
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

async function fetchNftPage(
  address: string,
  pageParams: Record<string, string | number | null> | null,
): Promise<BlockscoutNftPage> {
  const url = buildNftUrl(address, pageParams);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new BlockscoutApiError(
      "Unable to reach the Blockscout API. Check your network connection and try again.",
    );
  }

  if (!response.ok) {
    throw new BlockscoutApiError(
      `Blockscout API request failed (${response.status}).`,
      response.status,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new BlockscoutApiError("Blockscout API returned invalid JSON.");
  }

  if (!data || typeof data !== "object") {
    throw new BlockscoutApiError("Blockscout API returned an unexpected payload.");
  }

  return data as BlockscoutNftPage;
}

/**
 * Fetch all NFT pages for an address by following `next_page_params` sequentially.
 * Intended for browser-side use against the Blockscout REST API (CORS).
 */
export async function fetchAllNftsByOwner(address: string): Promise<NftItem[]> {
  const collected: NftItem[] = [];
  let pageParams: Record<string, string | number | null> | null = null;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchNftPage(address, pageParams);
    const items = Array.isArray(page.items) ? page.items : [];
    collected.push(...mapBlockscoutNftItems(items));

    const next = page.next_page_params;
    if (next && typeof next === "object" && Object.keys(next).length > 0) {
      pageParams = next;
    } else {
      hasMore = false;
    }
  }

  return collected;
}
