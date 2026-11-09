import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapBlockscoutCollection,
  mapBlockscoutCollections,
  parseHoldersCount,
  parseTotalSupply,
} from "./mapCollection";
import type { BlockscoutTokenCollection } from "./types";

function baseCollection(
  overrides: Partial<BlockscoutTokenCollection> = {},
): BlockscoutTokenCollection {
  return {
    address_hash: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    name: "Blockchain &amp; DLT Technologies Starter",
    symbol: "DLT-START",
    type: "ERC-721",
    holders_count: "58",
    total_supply: null,
    icon_url: null,
    ...overrides,
  };
}

describe("parseHoldersCount", () => {
  it("parses numeric strings and numbers", () => {
    assert.equal(parseHoldersCount("58"), 58);
    assert.equal(parseHoldersCount(0), 0);
    assert.equal(parseHoldersCount("0"), 0);
  });

  it("treats missing or blank values as unknown (null), not zero", () => {
    assert.equal(parseHoldersCount(null), null);
    assert.equal(parseHoldersCount(undefined), null);
    assert.equal(parseHoldersCount(""), null);
    assert.equal(parseHoldersCount("   "), null);
    assert.equal(parseHoldersCount("abc"), null);
  });
});

describe("parseTotalSupply", () => {
  it("preserves zero supply distinctly from unknown", () => {
    assert.equal(parseTotalSupply("0"), "0");
    assert.equal(parseTotalSupply(0), "0");
    assert.equal(parseTotalSupply(null), null);
    assert.equal(parseTotalSupply(undefined), null);
    assert.equal(parseTotalSupply(""), null);
  });

  it("keeps supply as a string", () => {
    assert.equal(parseTotalSupply("188"), "188");
    assert.equal(parseTotalSupply(188), "188");
  });
});

describe("mapBlockscoutCollection", () => {
  it("maps a valid ERC-721 collection and decodes HTML entities", () => {
    const collection = mapBlockscoutCollection(baseCollection());
    assert.ok(collection);
    assert.equal(
      collection.address,
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(
      collection.name,
      "Blockchain & DLT Technologies Starter",
    );
    assert.equal(collection.symbol, "DLT-START");
    assert.equal(collection.tokenType, "ERC-721");
    assert.equal(collection.holdersCount, 58);
    assert.equal(collection.totalSupply, null);
    assert.equal(collection.iconUrl, null);
  });

  it("maps ERC-1155 collections", () => {
    const collection = mapBlockscoutCollection(
      baseCollection({
        type: "ERC-1155",
        holders: "3",
        holders_count: undefined,
        total_supply: "12",
      }),
    );
    assert.ok(collection);
    assert.equal(collection.tokenType, "ERC-1155");
    assert.equal(collection.holdersCount, 3);
    assert.equal(collection.totalSupply, "12");
  });

  it("prefers address_hash and rejects invalid addresses", () => {
    assert.equal(
      mapBlockscoutCollection(
        baseCollection({ address_hash: "not-an-address", address: null }),
      ),
      null,
    );

    const viaAddress = mapBlockscoutCollection(
      baseCollection({
        address_hash: null,
        address: "0x1111111111111111111111111111111111111111",
      }),
    );
    assert.ok(viaAddress);
    assert.equal(
      viaAddress.address,
      "0x1111111111111111111111111111111111111111",
    );
  });

  it("handles missing optional fields without inventing values", () => {
    const collection = mapBlockscoutCollection(
      baseCollection({
        name: null,
        symbol: null,
        holders_count: null,
        holders: null,
        total_supply: null,
        icon_url: null,
        type: null,
      }),
    );
    assert.ok(collection);
    assert.equal(collection.name, null);
    assert.equal(collection.symbol, null);
    assert.equal(collection.holdersCount, null);
    assert.equal(collection.totalSupply, null);
    assert.equal(collection.iconUrl, null);
    assert.equal(collection.tokenType, "other");
  });

  it("resolves http icon URLs", () => {
    const collection = mapBlockscoutCollection(
      baseCollection({ icon_url: "https://example.com/icon.png" }),
    );
    assert.ok(collection);
    assert.equal(collection.iconUrl, "https://example.com/icon.png");
  });

  it("skips malformed list entries", () => {
    assert.deepEqual(
      mapBlockscoutCollections([
        baseCollection(),
        null as unknown as BlockscoutTokenCollection,
        baseCollection({ address_hash: "bad" }),
      ]),
      [
        mapBlockscoutCollection(baseCollection()),
      ],
    );
  });
});
