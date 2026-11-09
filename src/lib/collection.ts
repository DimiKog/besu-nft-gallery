import type { NftItem, NftTokenType } from "@/lib/nft";

/**
 * Opaque Blockscout pagination cursor (`next_page_params`).
 * Structurally identical to the client cursor type.
 */
export type PageCursor = Record<string, string | number | null>;

/** Cursor-paginated list result used by collection and wallet APIs. */
export type PaginatedResult<T> = {
  items: T[];
  /** Continuation cursor from Blockscout, or null when pagination is finished. */
  nextPageParams: PageCursor | null;
};

/**
 * NFT instance belonging to a collection.
 * Alias of the shared gallery `NftItem` so cards/media/details stay compatible.
 */
export type CollectionInstance = NftItem;

/**
 * Normalized NFT collection summary from Blockscout `/api/v2/tokens`.
 * Absent optional API values are `null` — never coerced to zero.
 */
export type CollectionSummary = {
  address: string;
  name: string | null;
  symbol: string | null;
  tokenType: NftTokenType;
  /** Holder count when Blockscout reports it; null when unknown. */
  holdersCount: number | null;
  /**
   * Total supply as reported by the API (string to avoid precision loss).
   * `null` means unknown/absent — distinct from `"0"`.
   */
  totalSupply: string | null;
  iconUrl: string | null;
};

/** Detailed collection view; currently the same fields as the summary. */
export type CollectionDetails = CollectionSummary;

/** Token type filter for Blockscout collection listing. */
export type CollectionTokenTypeFilter = "ERC-721" | "ERC-1155";
