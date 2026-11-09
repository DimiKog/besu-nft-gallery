import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapAttributes,
  mapBlockscoutNftItem,
  mapOwnerAddress,
  mapTokenId,
} from "./mapNft";
import type { BlockscoutNftItem } from "./types";

function baseItem(
  overrides: Partial<BlockscoutNftItem> = {},
): BlockscoutNftItem {
  return {
    id: "1",
    token_type: "ERC-721",
    value: "1",
    token: {
      address_hash: "0x1111111111111111111111111111111111111111",
      name: "Test Collection",
      symbol: "TEST",
      type: "ERC-721",
    },
    metadata: {
      name: "Test NFT",
      description: "A description",
      image: "https://example.com/a.png",
      attributes: [],
    },
    ...overrides,
  };
}

describe("mapAttributes", () => {
  it("maps trait_type and stringifies numeric values", () => {
    assert.deepEqual(
      mapAttributes([
        { trait_type: "XP", value: 7350 },
        { trait_type: "Lessons Completed", value: 16 },
      ]),
      [
        { traitType: "XP", value: "7350" },
        { traitType: "Lessons Completed", value: "16" },
      ],
    );
  });

  it("keeps numeric zero and boolean false", () => {
    assert.deepEqual(
      mapAttributes([
        { trait_type: "Count", value: 0 },
        { trait_type: "Active", value: false },
      ]),
      [
        { traitType: "Count", value: "0" },
        { traitType: "Active", value: "false" },
      ],
    );
  });

  it("omits null, undefined, empty, and whitespace-only values", () => {
    assert.deepEqual(
      mapAttributes([
        { trait_type: "Next Lesson", value: "" },
        { trait_type: "Blank", value: "   " },
        { trait_type: "Missing", value: null },
        { trait_type: "Undef", value: undefined },
        { trait_type: "Keep", value: "ok" },
      ]),
      [{ traitType: "Keep", value: "ok" }],
    );
  });

  it("returns an empty list when attributes are missing", () => {
    assert.deepEqual(mapAttributes(null), []);
    assert.deepEqual(mapAttributes(undefined), []);
  });
});

describe("mapBlockscoutNftItem", () => {
  it("maps description, attributes, and external_url", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        metadata: {
          name: "Named",
          description: "Full description",
          external_url: "https://example.com/external",
          image: "https://example.com/a.png",
          attributes: [{ trait_type: "Network", value: "Besu Edu-Net" }],
        },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.description, "Full description");
    assert.equal(nft.externalUrl, "https://example.com/external");
    assert.deepEqual(nft.attributes, [
      { traitType: "Network", value: "Besu Edu-Net" },
    ]);
  });

  it("decodes HTML entities in collection name and other text fields", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        token: {
          address_hash: "0x1111111111111111111111111111111111111111",
          name: "Blockchain &amp; Web3 Certificate",
          symbol: "B&amp;C",
          type: "ERC-721",
        },
        metadata: {
          name: "A &amp; B",
          description: "Uses &lt;code&gt; &amp; &#39;quotes&#39;",
          image: "https://example.com/a.png",
          attributes: [{ trait_type: "Type &amp; Kind", value: "A &amp; B" }],
        },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.collectionName, "Blockchain & Web3 Certificate");
    assert.equal(nft.collectionSymbol, "B&C");
    assert.equal(nft.name, "A & B");
    assert.equal(nft.description, "Uses <code> & 'quotes'");
    assert.deepEqual(nft.attributes, [
      { traitType: "Type & Kind", value: "A & B" },
    ]);
  });

  it("falls back to external_app_url when external_url is absent", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        external_app_url: "https://example.com/app",
        metadata: {
          name: "Named",
          description: "Desc",
          image: "https://example.com/a.png",
          attributes: [],
        },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.externalUrl, "https://example.com/app");
  });

  it("prefers external_url over external_app_url", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        external_app_url: "https://example.com/app",
        metadata: {
          name: "Named",
          external_url: "https://example.com/meta",
          image: "https://example.com/a.png",
          attributes: [],
        },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.externalUrl, "https://example.com/meta");
  });

  it("falls back to external_app_url when external_url is unsafe", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        external_app_url: "https://example.com/safe",
        metadata: {
          name: "Named",
          external_url: "javascript:alert(1)",
          image: "https://example.com/a.png",
          attributes: [],
        },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.externalUrl, "https://example.com/safe");
  });

  it("rejects non-http(s) external URLs", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        external_app_url: "data:text/html,hi",
        metadata: {
          name: "Named",
          external_url: "/relative/path",
          image: "https://example.com/a.png",
          attributes: [],
        },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.externalUrl, null);
  });

  it("handles null metadata without crashing", () => {
    const nft = mapBlockscoutNftItem(
      baseItem({
        metadata: null,
        image_url: null,
        media_url: null,
      }),
    );

    assert.ok(nft);
    assert.equal(nft.name, null);
    assert.equal(nft.description, null);
    assert.deepEqual(nft.attributes, []);
    assert.equal(nft.externalUrl, null);
    assert.equal(nft.imageUrl, null);
    assert.equal(nft.collectionName, "Test Collection");
    assert.equal(nft.tokenId, "1");
    assert.equal(nft.tokenType, "ERC-721");
    assert.equal(nft.ownerAddress, null);
  });

  it("maps owner hash and preserves large string token IDs", () => {
    const largeId = "9007199254740993";
    const nft = mapBlockscoutNftItem(
      baseItem({
        id: largeId,
        owner: { hash: "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F" },
      }),
    );

    assert.ok(nft);
    assert.equal(nft.tokenId, largeId);
    assert.equal(
      nft.ownerAddress,
      "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F",
    );
  });

  it("uses fallback contract address when token info is missing", () => {
    const nft = mapBlockscoutNftItem(
      {
        id: "9",
        metadata: { name: "Fallback" },
        token: null,
      },
      {
        fallbackContractAddress:
          "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
        fallbackTokenType: "ERC-721",
      },
    );

    assert.ok(nft);
    assert.equal(
      nft.contractAddress,
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(nft.tokenType, "ERC-721");
    assert.equal(nft.name, "Fallback");
  });
});

describe("mapOwnerAddress", () => {
  it("supports owner object and string shapes", () => {
    assert.equal(
      mapOwnerAddress({ hash: "0x1111111111111111111111111111111111111111" }),
      "0x1111111111111111111111111111111111111111",
    );
    assert.equal(
      mapOwnerAddress("0x2222222222222222222222222222222222222222"),
      "0x2222222222222222222222222222222222222222",
    );
    assert.equal(mapOwnerAddress(null), null);
    assert.equal(mapOwnerAddress({}), null);
  });
});

describe("mapTokenId", () => {
  it("keeps token IDs as strings without Number precision loss", () => {
    assert.equal(mapTokenId("9007199254740993"), "9007199254740993");
    assert.equal(mapTokenId(" 42 "), "42");
    assert.equal(mapTokenId(""), null);
    assert.equal(mapTokenId(null), null);
  });
});
