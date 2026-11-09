import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CollectionSummary } from "./collection";
import {
  abbreviateAddress,
  appendUniqueCollections,
  applyStandardPageResult,
  collectionCardAccessibleName,
  createStandardPaginationState,
  isStandardEligibleForDirectoryLoadMore,
  normalizeCollectionAddress,
  shouldShowDirectoryLoadMore,
  shouldShowEmptyDirectoryMessage,
} from "./collectionsDirectory";
import { serializePageCursor } from "./nftPagination";

function sampleCollection(
  address: string,
  overrides: Partial<CollectionSummary> = {},
): CollectionSummary {
  return {
    address,
    name: "Demo",
    symbol: "DEMO",
    tokenType: "ERC-721",
    holdersCount: 3,
    totalSupply: "3",
    iconUrl: null,
    ...overrides,
  };
}

describe("appendUniqueCollections", () => {
  it("merges ERC-721 and ERC-1155 results without inventing metadata", () => {
    const merged = appendUniqueCollections(
      [
        sampleCollection("0xAAA0000000000000000000000000000000000001", {
          name: null,
          holdersCount: null,
          totalSupply: null,
          tokenType: "ERC-721",
        }),
      ],
      [
        sampleCollection("0xBBB0000000000000000000000000000000000002", {
          tokenType: "ERC-1155",
          totalSupply: "0",
          holdersCount: 0,
        }),
      ],
    );

    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.name, null);
    assert.equal(merged[0]?.holdersCount, null);
    assert.equal(merged[0]?.totalSupply, null);
    assert.equal(merged[1]?.tokenType, "ERC-1155");
    assert.equal(merged[1]?.totalSupply, "0");
    assert.equal(merged[1]?.holdersCount, 0);
  });

  it("deduplicates by normalized contract address", () => {
    const a = "0xAaA0000000000000000000000000000000000001";
    const b = "0xaaa0000000000000000000000000000000000001";
    const merged = appendUniqueCollections(
      [sampleCollection(a, { name: "First" })],
      [sampleCollection(b, { name: "Duplicate" })],
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.name, "First");
    assert.equal(
      normalizeCollectionAddress(merged[0]!.address),
      normalizeCollectionAddress(a),
    );
  });

  it("keeps similarly named collections with different addresses", () => {
    const merged = appendUniqueCollections(
      [
        sampleCollection("0x1111111111111111111111111111111111111111", {
          name: "Soulbound Identity",
        }),
      ],
      [
        sampleCollection("0x2222222222222222222222222222222222222222", {
          name: "Soulbound Identity",
        }),
      ],
    );
    assert.equal(merged.length, 2);
  });
});

describe("directory pagination helpers", () => {
  it("offers Load More while either eligible standard still has a cursor", () => {
    assert.equal(
      shouldShowDirectoryLoadMore(
        { cursor: { unique_token: 1 }, error: null },
        { cursor: null, error: null },
      ),
      true,
    );
    assert.equal(
      shouldShowDirectoryLoadMore(
        { cursor: null, error: null },
        { cursor: { items_count: 50 }, error: null },
      ),
      true,
    );
    assert.equal(
      shouldShowDirectoryLoadMore(
        { cursor: null, error: null },
        { cursor: null, error: null },
      ),
      false,
    );
  });

  it("hides Load More for a failed standard so Retry cannot advance a healthy one", () => {
    const failed721 = {
      cursor: { holder_count: 10, items_count: 50 },
      error: "Unable to load more ERC-721 collections.",
    };
    const healthy1155 = {
      cursor: { holder_count: 4, items_count: 50 },
      error: null,
    };

    assert.equal(isStandardEligibleForDirectoryLoadMore(failed721), false);
    assert.equal(isStandardEligibleForDirectoryLoadMore(healthy1155), true);
    assert.equal(shouldShowDirectoryLoadMore(failed721, healthy1155), true);
    assert.equal(
      shouldShowDirectoryLoadMore(failed721, {
        cursor: null,
        error: null,
      }),
      false,
    );
  });

  it("preserves cursor and history when a Load More failure only records an error", () => {
    let state = createStandardPaginationState();
    const cursorA = { holder_count: 10, items_count: 50 };
    const cursorB = { holder_count: 5, items_count: 50 };

    state = applyStandardPageResult(state, null, cursorA);
    state = applyStandardPageResult(state, cursorA, cursorB);
    assert.deepEqual(state.cursor, cursorB);
    assert.equal(state.history.has(serializePageCursor(cursorA)!), true);
    assert.equal(state.history.has(serializePageCursor(cursorB)!), false);

    const historySizeBeforeFailure = state.history.size;
    const failed = { ...state, error: "Unable to load more ERC-721 collections." };

    assert.deepEqual(failed.cursor, cursorB);
    assert.equal(failed.history.size, historySizeBeforeFailure);
    assert.equal(failed.history.has(serializePageCursor(cursorB)!), false);
    assert.equal(isStandardEligibleForDirectoryLoadMore(failed), false);
  });

  it("stops a standard when its cursor repeats or cycles", () => {
    let state = createStandardPaginationState();
    const cursorA = { holder_count: 10, items_count: 50 };
    const cursorB = { holder_count: 5, items_count: 50 };

    state = applyStandardPageResult(state, null, cursorA);
    assert.deepEqual(state.cursor, cursorA);

    state = applyStandardPageResult(state, cursorA, cursorB);
    assert.deepEqual(state.cursor, cursorB);

    state = applyStandardPageResult(state, cursorB, cursorA);
    assert.equal(state.cursor, null);
  });

  it("keeps an empty page continuation cursor for a standard", () => {
    let state = createStandardPaginationState();
    state = applyStandardPageResult(state, null, {
      holder_count: 1,
      items_count: 50,
    });
    assert.deepEqual(state.cursor, {
      holder_count: 1,
      items_count: 50,
    });
  });
});

describe("shouldShowEmptyDirectoryMessage", () => {
  it("shows the empty-directory message only after both standards succeed with no results", () => {
    assert.equal(
      shouldShowEmptyDirectoryMessage({
        status: "ready",
        collectionCount: 0,
        erc721: { cursor: null, error: null },
        erc1155: { cursor: null, error: null },
      }),
      true,
    );
  });

  it("hides the empty-directory message when one standard failed", () => {
    assert.equal(
      shouldShowEmptyDirectoryMessage({
        status: "ready",
        collectionCount: 0,
        erc721: {
          cursor: null,
          error: "Unable to load ERC-721 collections.",
        },
        erc1155: { cursor: null, error: null },
      }),
      false,
    );
  });

  it("hides the empty-directory message while a continuation cursor remains", () => {
    assert.equal(
      shouldShowEmptyDirectoryMessage({
        status: "ready",
        collectionCount: 0,
        erc721: { cursor: { items_count: 50 }, error: null },
        erc1155: { cursor: null, error: null },
      }),
      false,
    );
  });

  it("hides the empty-directory message when collections are already loaded", () => {
    assert.equal(
      shouldShowEmptyDirectoryMessage({
        status: "ready",
        collectionCount: 2,
        erc721: { cursor: null, error: null },
        erc1155: { cursor: null, error: null },
      }),
      false,
    );
  });
});

describe("abbreviateAddress", () => {
  it("shortens long contract addresses for cards", () => {
    assert.equal(
      abbreviateAddress("0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9"),
      "0x5Ad2…69c9",
    );
  });
});

describe("collectionCardAccessibleName", () => {
  it("includes collection title and abbreviated contract identity", () => {
    assert.equal(
      collectionCardAccessibleName(
        "Web3Edu Identity",
        "0x1234567890abcdef1234567890abcdef1234abcd",
      ),
      "Open collection Web3Edu Identity, contract 0x1234…abcd",
    );
  });

  it("distinguishes unnamed collections by contract identity", () => {
    assert.equal(
      collectionCardAccessibleName(
        null,
        "0x1111111111111111111111111111111111111111",
      ),
      "Open collection Unnamed collection, contract 0x1111…1111",
    );
    assert.notEqual(
      collectionCardAccessibleName(
        null,
        "0x1111111111111111111111111111111111111111",
      ),
      collectionCardAccessibleName(
        null,
        "0x2222222222222222222222222222222222222222",
      ),
    );
  });
});
