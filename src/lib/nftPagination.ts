import type { BlockscoutPageParams } from "@/lib/blockscout/client";
import type { NftItem } from "@/lib/nft";

/**
 * Append incoming NFTs while dropping duplicates already present (by `id`).
 * Preserves existing order; appends new ids in incoming order.
 */
export function appendUniqueNfts(
  existing: NftItem[],
  incoming: NftItem[],
): NftItem[] {
  if (incoming.length === 0) {
    return existing;
  }

  const seen = new Set(existing.map((item) => item.id));
  const merged = existing.slice();

  for (const item of incoming) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

/** Stable serialization for opaque Blockscout cursors. */
export function serializePageCursor(
  cursor: BlockscoutPageParams | null,
): string | null {
  if (cursor == null) {
    return null;
  }

  const keys = Object.keys(cursor).sort();
  if (keys.length === 0) {
    return null;
  }

  return keys
    .map((key) => `${key}:${JSON.stringify(cursor[key])}`)
    .join("|");
}

export function arePageCursorsEqual(
  left: BlockscoutPageParams | null,
  right: BlockscoutPageParams | null,
): boolean {
  return serializePageCursor(left) === serializePageCursor(right);
}

/** Cursor identities requested during the current collection pagination session. */
export type RequestedCursorHistory = Set<string>;

export function createRequestedCursorHistory(): RequestedCursorHistory {
  return new Set();
}

/**
 * Record a cursor that is about to be requested (Load More).
 * No-ops for null/empty cursors. Growth is bounded by user-requested pages.
 */
export function rememberRequestedCursor(
  history: RequestedCursorHistory,
  cursor: BlockscoutPageParams | null,
): void {
  const key = serializePageCursor(cursor);
  if (key) {
    history.add(key);
  }
}

/**
 * Choose the next continuation cursor after a page fetch.
 *
 * Stops when:
 * - the API returns no cursor
 * - the API echoes the same cursor that was just requested
 * - the API returns a cursor that was already requested in this session
 *   (detects cycles such as A → B → A)
 */
export function resolveContinuationCursor(
  requested: BlockscoutPageParams | null,
  received: BlockscoutPageParams | null,
  requestedHistory?: ReadonlySet<string>,
): BlockscoutPageParams | null {
  if (received == null) {
    return null;
  }
  if (requested != null && arePageCursorsEqual(requested, received)) {
    return null;
  }

  const receivedKey = serializePageCursor(received);
  if (receivedKey && requestedHistory?.has(receivedKey)) {
    return null;
  }

  return received;
}

/**
 * Whether collection mode should offer Load More.
 * Depends on success + continuation cursor — not on item count —
 * so an empty first page with a cursor remains continuable.
 */
export function shouldShowCollectionLoadMore(
  status: "idle" | "loading" | "success" | "error",
  nextPageParams: BlockscoutPageParams | null,
): boolean {
  return status === "success" && nextPageParams != null;
}
