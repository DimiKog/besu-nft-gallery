import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCollectionGallerySearch,
  buildCollectionsViewSearch,
  buildHomeGallerySearch,
  buildWalletGallerySearch,
  resolveActiveNav,
  resolveGalleryDeepLink,
  shouldSkipGalleryNav,
} from "./galleryQuery";

const WALLET = "0x0E66db7d115B8F392eB7DFb8BaCb23675dAEB59E";
const CONTRACT = "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9";

describe("resolveGalleryDeepLink", () => {
  it("defaults to none for the Wallet Gallery landing URL", () => {
    assert.deepEqual(resolveGalleryDeepLink(""), { type: "none" });
    assert.deepEqual(resolveGalleryDeepLink("?utm=1"), { type: "none" });
  });

  it("resolves the All Collections deep link", () => {
    assert.deepEqual(resolveGalleryDeepLink("?view=collections"), {
      type: "collections",
    });
    assert.deepEqual(resolveGalleryDeepLink("?view=Collections&utm=edu"), {
      type: "collections",
    });
  });

  it("loads a valid contract deep link", () => {
    assert.deepEqual(resolveGalleryDeepLink(`?contract=${CONTRACT}`), {
      type: "collection",
      contract: CONTRACT,
    });
  });

  it("returns collection-invalid for malformed contracts", () => {
    assert.deepEqual(resolveGalleryDeepLink("?contract=0x123"), {
      type: "collection-invalid",
      raw: "0x123",
    });
  });

  it("loads a valid wallet deep link when contract/view are absent", () => {
    assert.deepEqual(resolveGalleryDeepLink(`?address=${WALLET}`), {
      type: "wallet",
      address: WALLET,
    });
  });

  it("gives contract precedence over view and address", () => {
    assert.deepEqual(
      resolveGalleryDeepLink(
        `?view=collections&address=${WALLET}&contract=${CONTRACT}`,
      ),
      {
        type: "collection",
        contract: CONTRACT,
      },
    );
    assert.deepEqual(
      resolveGalleryDeepLink(`?view=collections&contract=0xbad`),
      {
        type: "collection-invalid",
        raw: "0xbad",
      },
    );
  });

  it("gives collections view precedence over address", () => {
    assert.deepEqual(
      resolveGalleryDeepLink(`?view=collections&address=${WALLET}`),
      { type: "collections" },
    );
  });

  it("supports browser back/forward style search strings", () => {
    assert.equal(
      resolveGalleryDeepLink(`?view=collections`).type,
      "collections",
    );
    assert.equal(
      resolveGalleryDeepLink(`?contract=${CONTRACT}`).type,
      "collection",
    );
    assert.equal(resolveGalleryDeepLink(`?address=${WALLET}`).type, "wallet");
    assert.equal(resolveGalleryDeepLink("").type, "none");
  });
});

describe("gallery search builders", () => {
  it("builds collections view while clearing obsolete mode params", () => {
    assert.equal(
      buildCollectionsViewSearch(
        `?address=${WALLET}&contract=${CONTRACT}&utm=edu`,
      ),
      "?utm=edu&view=collections",
    );
  });

  it("builds wallet search while removing contract/view", () => {
    assert.equal(
      buildWalletGallerySearch(
        `?view=collections&contract=${CONTRACT}&utm=edu`,
        WALLET,
      ),
      `?utm=edu&address=${WALLET}`,
    );
  });

  it("builds collection detail search while removing address/view", () => {
    assert.equal(
      buildCollectionGallerySearch(
        `?view=collections&address=${WALLET}&utm=edu`,
        CONTRACT,
      ),
      `?utm=edu&contract=${CONTRACT}`,
    );
  });

  it("builds home search by clearing mode params only", () => {
    assert.equal(
      buildHomeGallerySearch(
        `?address=${WALLET}&contract=${CONTRACT}&view=collections&utm=edu`,
      ),
      "?utm=edu",
    );
  });
});

describe("resolveActiveNav", () => {
  it("highlights Collections for directory and detail modes", () => {
    assert.equal(resolveActiveNav("collections"), "collections");
    assert.equal(resolveActiveNav("collection"), "collections");
  });

  it("highlights Wallet Gallery for wallet mode", () => {
    assert.equal(resolveActiveNav("wallet"), "wallet");
  });
});

describe("shouldSkipGalleryNav", () => {
  it("skips Collections when already on the collections directory URL", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "collections",
        mode: "collections",
        currentSearch: "?view=collections",
      }),
      true,
    );
    assert.equal(
      shouldSkipGalleryNav({
        destination: "collections",
        mode: "collections",
        currentSearch: "?utm=edu&view=collections",
      }),
      true,
    );
  });

  it("does not skip Collections from Collection Detail", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "collections",
        mode: "collection",
        currentSearch: `?contract=${CONTRACT}`,
      }),
      false,
    );
  });

  it("skips Wallet Gallery only when already on the wallet home URL", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: "",
      }),
      true,
    );
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: "?utm=edu",
      }),
      true,
    );
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: `?address=${WALLET}`,
      }),
      false,
    );
  });

  it("preserves unrelated params when deciding whether a nav target matches", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "collections",
        mode: "collections",
        currentSearch: "?utm=edu&view=collections&ref=nav",
      }),
      true,
    );
    assert.equal(
      buildCollectionsViewSearch("?utm=edu&view=collections&ref=nav"),
      "?utm=edu&view=collections&ref=nav",
    );
  });
});
