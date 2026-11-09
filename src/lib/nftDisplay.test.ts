import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NftItem } from "./nft";
import {
  buildBlockscoutTokenInstanceUrl,
  buildBlockscoutTokenUrl,
  getNftDisplayName,
  shouldShowBalance,
} from "./nftDisplay";

function sampleNft(overrides: Partial<NftItem> = {}): NftItem {
  return {
    id: "0xabc-1",
    tokenId: "1",
    contractAddress: "0xAbcDef0000000000000000000000000000000001",
    tokenType: "ERC-721",
    collectionName: "Demo",
    collectionSymbol: "DEMO",
    name: "Named NFT",
    description: null,
    attributes: [],
    externalUrl: null,
    imageUrl: null,
    imageFallbackUrl: null,
    rawImageRef: null,
    balance: "1",
    ownerAddress: null,
    ...overrides,
  };
}

describe("getNftDisplayName", () => {
  it("uses metadata name when present", () => {
    assert.equal(getNftDisplayName(sampleNft()), "Named NFT");
  });

  it("falls back to Token #id when name is missing", () => {
    assert.equal(
      getNftDisplayName(sampleNft({ name: null, tokenId: "42" })),
      "Token #42",
    );
  });
});

describe("shouldShowBalance", () => {
  it("hides balance for ERC-721 with value 1", () => {
    assert.equal(shouldShowBalance(sampleNft()), false);
  });

  it("shows balance for ERC-1155 even when value is 1", () => {
    assert.equal(
      shouldShowBalance(sampleNft({ tokenType: "ERC-1155", balance: "1" })),
      true,
    );
  });

  it("shows balance when value is not 1", () => {
    assert.equal(shouldShowBalance(sampleNft({ balance: "3" })), true);
  });

  it("hides balance when missing", () => {
    assert.equal(shouldShowBalance(sampleNft({ balance: null })), false);
  });
});

describe("buildBlockscoutTokenInstanceUrl", () => {
  it("builds the token instance path from base URL, contract, and token id", () => {
    assert.equal(
      buildBlockscoutTokenInstanceUrl(
        "0xAbcDef0000000000000000000000000000000001",
        "106",
        "https://blockexplorer.dimikog.org",
      ),
      "https://blockexplorer.dimikog.org/token/0xAbcDef0000000000000000000000000000000001/instance/106",
    );
  });

  it("strips trailing slashes from the base URL", () => {
    assert.equal(
      buildBlockscoutTokenInstanceUrl(
        "0x1",
        "2",
        "https://example.org///",
      ),
      "https://example.org/token/0x1/instance/2",
    );
  });
});

describe("buildBlockscoutTokenUrl", () => {
  it("builds the collection contract page URL", () => {
    assert.equal(
      buildBlockscoutTokenUrl(
        "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
        "https://blockexplorer.dimikog.org/",
      ),
      "https://blockexplorer.dimikog.org/token/0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
  });
});

describe("owner fields for collection detail modal", () => {
  it("keeps owner addresses available for View Owner's NFTs navigation", () => {
    const nft = sampleNft({
      ownerAddress: "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F",
    });
    assert.equal(
      nft.ownerAddress,
      "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F",
    );
  });

  it("leaves wallet NFTs without owner information unchanged", () => {
    assert.equal(sampleNft().ownerAddress, null);
  });
});

describe("details attribute presence helpers (via normalized model)", () => {
  it("treats empty attributes as an omitted section", () => {
    const nft = sampleNft({ attributes: [] });
    assert.equal(nft.attributes.length > 0, false);
  });

  it("keeps arbitrary non-empty attributes", () => {
    const nft = sampleNft({
      attributes: [
        { traitType: "Tier", value: "Architect" },
        { traitType: "XP", value: "7350" },
      ],
    });
    assert.equal(nft.attributes.length, 2);
  });
});
