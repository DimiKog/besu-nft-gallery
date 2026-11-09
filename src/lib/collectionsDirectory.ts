import type { BlockscoutPageParams } from "@/lib/blockscout/client";
import type { CollectionSummary } from "@/lib/collection";
import {
  createRequestedCursorHistory,
  rememberRequestedCursor,
  resolveContinuationCursor,
  type RequestedCursorHistory,
} from "@/lib/nftPagination";

export type CollectionTokenStandard = "ERC-721" | "ERC-1155";

export type StandardPaginationState = {
  cursor: BlockscoutPageParams | null;
  history: RequestedCursorHistory;
  error: string | null;
};

export function createStandardPaginationState(): StandardPaginationState {
  return {
    cursor: null,
    history: createRequestedCursorHistory(),
    error: null,
  };
}

/** Normalize contract address for identity comparison. */
export function normalizeCollectionAddress(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Append collections while deduplicating by normalized contract address.
 * Preserves existing order; keeps the first-seen entry for a given address.
 */
export function appendUniqueCollections(
  existing: CollectionSummary[],
  incoming: CollectionSummary[],
): CollectionSummary[] {
  if (incoming.length === 0) {
    return existing;
  }

  const seen = new Set(
    existing.map((item) => normalizeCollectionAddress(item.address)),
  );
  const merged = existing.slice();

  for (const item of incoming) {
    const key = normalizeCollectionAddress(item.address);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export function abbreviateAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

export function applyStandardPageResult(
  state: StandardPaginationState,
  requested: BlockscoutPageParams | null,
  received: BlockscoutPageParams | null,
): StandardPaginationState {
  if (requested != null) {
    rememberRequestedCursor(state.history, requested);
  }
  return {
    ...state,
    cursor: resolveContinuationCursor(requested, received, state.history),
    error: null,
  };
}

/**
 * A standard is eligible for unified Load More only when it still has a
 * continuation cursor and no outstanding error. Failed standards must be
 * retried separately so a healthy standard is not advanced by accident.
 */
export function isStandardEligibleForDirectoryLoadMore(
  state: Pick<StandardPaginationState, "cursor" | "error">,
): boolean {
  return state.cursor != null && state.error == null;
}

export function shouldShowDirectoryLoadMore(
  erc721: Pick<StandardPaginationState, "cursor" | "error">,
  erc1155: Pick<StandardPaginationState, "cursor" | "error">,
): boolean {
  return (
    isStandardEligibleForDirectoryLoadMore(erc721) ||
    isStandardEligibleForDirectoryLoadMore(erc1155)
  );
}

/**
 * Show the definitive empty-directory message only when both standards
 * completed successfully with no collections and no remaining cursors.
 */
export function shouldShowEmptyDirectoryMessage(input: {
  status: "loading" | "ready" | "error";
  collectionCount: number;
  erc721: Pick<StandardPaginationState, "cursor" | "error">;
  erc1155: Pick<StandardPaginationState, "cursor" | "error">;
}): boolean {
  if (input.status !== "ready") {
    return false;
  }
  if (input.collectionCount > 0) {
    return false;
  }
  if (input.erc721.cursor != null || input.erc1155.cursor != null) {
    return false;
  }
  if (input.erc721.error != null || input.erc1155.error != null) {
    return false;
  }
  return true;
}

/** Concise accessible name that includes enough contract identity to distinguish cards. */
export function collectionCardAccessibleName(
  name: string | null | undefined,
  address: string,
): string {
  const title = name?.trim() ? name.trim() : "Unnamed collection";
  return `Open collection ${title}, contract ${abbreviateAddress(address)}`;
}
