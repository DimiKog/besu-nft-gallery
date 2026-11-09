import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCollectionGallerySearch,
  buildHomeGallerySearch,
  buildWalletGallerySearch,
  resolveGalleryDeepLink,
} from "./galleryQuery";

const WALLET = "0x0E66db7d115B8F392eB7DFb8BaCb23675dAEB59E";
const CONTRACT = "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9";

describe("resolveGalleryDeepLink", () => {
  it("returns none when contract and address are missing", () => {
    assert.deepEqual(resolveGalleryDeepLink(""), { type: "none" });
    assert.deepEqual(resolveGalleryDeepLink("?utm=1"), { type: "none" });
  });

  it("loads a valid contract deep link", () => {
    assert.deepEqual(resolveGalleryDeepLink(`?contract=${CONTRACT}`), {
      type: "collection",
      contract: CONTRACT,
    });
  });

  it("returns collection-invalid for malformed contracts without calling wallet mode", () => {
    assert.deepEqual(resolveGalleryDeepLink("?contract=0x123"), {
      type: "collection-invalid",
      raw: "0x123",
    });
    assert.deepEqual(resolveGalleryDeepLink("?contract="), {
      type: "collection-invalid",
      raw: "",
    });
  });

  it("loads a valid wallet deep link when contract is absent", () => {
    assert.deepEqual(resolveGalleryDeepLink(`?address=${WALLET}`), {
      type: "wallet",
      address: WALLET,
    });
  });

  it("returns wallet-invalid for malformed address parameters", () => {
    assert.deepEqual(resolveGalleryDeepLink("?address=0xbad"), {
      type: "wallet-invalid",
      raw: "0xbad",
    });
  });

  it("gives contract precedence when both address and contract are present", () => {
    assert.deepEqual(
      resolveGalleryDeepLink(`?address=${WALLET}&contract=${CONTRACT}`),
      {
        type: "collection",
        contract: CONTRACT,
      },
    );
    assert.deepEqual(
      resolveGalleryDeepLink(`?contract=0xbad&address=${WALLET}`),
      {
        type: "collection-invalid",
        raw: "0xbad",
      },
    );
  });

  it("supports browser back/forward style search strings", () => {
    // Forward to collection
    assert.equal(
      resolveGalleryDeepLink(`?contract=${CONTRACT}`).type,
      "collection",
    );
    // Back to wallet
    assert.equal(
      resolveGalleryDeepLink(`?address=${WALLET}`).type,
      "wallet",
    );
    // Back to home
    assert.equal(resolveGalleryDeepLink("").type, "none");
    assert.equal(resolveGalleryDeepLink("?utm_source=edu").type, "none");
  });
});

describe("gallery search builders", () => {
  it("builds wallet search while removing contract and preserving unrelated params", () => {
    assert.equal(
      buildWalletGallerySearch(`?contract=${CONTRACT}&utm=edu`, WALLET),
      `?utm=edu&address=${WALLET}`,
    );
  });

  it("builds collection search while removing address and preserving unrelated params", () => {
    assert.equal(
      buildCollectionGallerySearch(`?address=${WALLET}&utm=edu`, CONTRACT),
      `?utm=edu&contract=${CONTRACT}`,
    );
  });

  it("builds home search by clearing mode params only", () => {
    assert.equal(
      buildHomeGallerySearch(`?address=${WALLET}&contract=${CONTRACT}&utm=edu`),
      "?utm=edu",
    );
    assert.equal(buildHomeGallerySearch(`?address=${WALLET}`), "");
  });
});
