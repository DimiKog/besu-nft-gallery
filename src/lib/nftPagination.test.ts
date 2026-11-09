import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NftItem } from "./nft";
import {
  appendUniqueNfts,
  arePageCursorsEqual,
  createRequestedCursorHistory,
  rememberRequestedCursor,
  resolveContinuationCursor,
  serializePageCursor,
  shouldShowCollectionLoadMore,
} from "./nftPagination";

function sampleNft(id: string, tokenId = id.split("-").at(-1) ?? "1"): NftItem {
  return {
    id,
    tokenId,
    contractAddress: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    tokenType: "ERC-721",
    collectionName: "Demo",
    collectionSymbol: "DEMO",
    name: `NFT ${tokenId}`,
    description: null,
    attributes: [],
    externalUrl: null,
    imageUrl: null,
    imageFallbackUrl: null,
    rawImageRef: null,
    balance: "1",
    ownerAddress: null,
  };
}

describe("appendUniqueNfts", () => {
  it("appends only unseen ids and preserves order", () => {
    const existing = [sampleNft("c-1"), sampleNft("c-2")];
    const incoming = [sampleNft("c-2"), sampleNft("c-3"), sampleNft("c-1")];
    const merged = appendUniqueNfts(existing, incoming);
    assert.deepEqual(
      merged.map((item) => item.id),
      ["c-1", "c-2", "c-3"],
    );
  });

  it("returns the existing list when incoming is empty", () => {
    const existing = [sampleNft("c-1")];
    assert.equal(appendUniqueNfts(existing, []), existing);
  });
});

describe("page cursor helpers", () => {
  it("treats key order as insignificant for equality", () => {
    assert.equal(
      arePageCursorsEqual(
        { items_count: 50, unique_token: 10 },
        { unique_token: 10, items_count: 50 },
      ),
      true,
    );
    assert.equal(
      serializePageCursor({ unique_token: 10, items_count: 50 }),
      serializePageCursor({ items_count: 50, unique_token: 10 }),
    );
  });

  it("resolves first-page continuation cursors", () => {
    assert.deepEqual(
      resolveContinuationCursor(null, { unique_token: 57, items_count: 50 }),
      { unique_token: 57, items_count: 50 },
    );
  });

  it("keeps a new cursor after an empty page", () => {
    const requested = { unique_token: 57, items_count: 50 };
    const received = { unique_token: 40, items_count: 50 };
    assert.deepEqual(
      resolveContinuationCursor(requested, received),
      received,
    );
  });

  it("stops pagination when Blockscout repeats the requested cursor", () => {
    const cursor = { unique_token: 57, items_count: 50 };
    assert.equal(resolveContinuationCursor(cursor, cursor), null);
    assert.equal(
      resolveContinuationCursor(cursor, {
        items_count: 50,
        unique_token: 57,
      }),
      null,
    );
  });

  it("ends pagination when the response cursor is null", () => {
    assert.equal(
      resolveContinuationCursor({ unique_token: 1 }, null),
      null,
    );
  });

  it("stops pagination on cursor cycles such as A → B → A", () => {
    const history = createRequestedCursorHistory();
    const cursorA = { unique_token: 100, items_count: 50 };
    const cursorB = { unique_token: 50, items_count: 50 };

    // First page offers A (not yet requested).
    assert.deepEqual(
      resolveContinuationCursor(null, cursorA, history),
      cursorA,
    );

    // Load More requests A, receives B.
    rememberRequestedCursor(history, cursorA);
    assert.deepEqual(
      resolveContinuationCursor(cursorA, cursorB, history),
      cursorB,
    );

    // Load More requests B, receives A again → cycle stopped.
    rememberRequestedCursor(history, cursorB);
    assert.equal(
      resolveContinuationCursor(cursorB, cursorA, history),
      null,
    );
  });

  it("resets cycle detection when a new history session is created", () => {
    const firstSession = createRequestedCursorHistory();
    const cursorA = { unique_token: 1, items_count: 50 };
    rememberRequestedCursor(firstSession, cursorA);

    const secondSession = createRequestedCursorHistory();
    assert.deepEqual(
      resolveContinuationCursor(null, cursorA, secondSession),
      cursorA,
    );
  });
});

describe("shouldShowCollectionLoadMore", () => {
  it("shows Load More on success when a continuation cursor exists, even with zero items", () => {
    assert.equal(
      shouldShowCollectionLoadMore("success", {
        unique_token: 57,
        items_count: 50,
      }),
      true,
    );
  });

  it("hides Load More for a genuinely empty collection with no cursor", () => {
    assert.equal(shouldShowCollectionLoadMore("success", null), false);
  });

  it("hides Load More while loading or on error", () => {
    assert.equal(
      shouldShowCollectionLoadMore("loading", { unique_token: 1 }),
      false,
    );
    assert.equal(
      shouldShowCollectionLoadMore("error", { unique_token: 1 }),
      false,
    );
    assert.equal(shouldShowCollectionLoadMore("idle", { unique_token: 1 }), false);
  });
});
