import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCollectionGallerySearch,
  buildCollectionsViewSearch,
  buildHomeGallerySearch,
  buildWalletGallerySearch,
  buildWalletViewSearch,
  resolveActiveNav,
  resolveGalleryDeepLink,
  shouldSkipGalleryNav,
} from "./galleryQuery";

const WALLET = "0x0E66db7d115B8F392eB7DFb8BaCb23675dAEB59E";
const CONTRACT = "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9";

describe("resolveGalleryDeepLink", () => {
  it("defaults to Discover for the landing URL", () => {
    assert.deepEqual(resolveGalleryDeepLink(""), { type: "discover" });
    assert.deepEqual(resolveGalleryDeepLink("?utm=1"), { type: "discover" });
  });

  it("resolves the All Collections deep link", () => {
    assert.deepEqual(resolveGalleryDeepLink("?view=collections"), {
      type: "collections",
    });
    assert.deepEqual(resolveGalleryDeepLink("?view=Collections&utm=edu"), {
      type: "collections",
    });
  });

  it("resolves Wallet Gallery idle via view=wallet", () => {
    assert.deepEqual(resolveGalleryDeepLink("?view=wallet"), { type: "none" });
    assert.deepEqual(resolveGalleryDeepLink("?view=Wallet&utm=edu"), {
      type: "none",
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

  it("retains address deep links without requiring view=wallet", () => {
    assert.deepEqual(resolveGalleryDeepLink(`?address=${WALLET}&utm=edu`), {
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
    assert.deepEqual(
      resolveGalleryDeepLink(`?view=wallet&contract=${CONTRACT}`),
      {
        type: "collection",
        contract: CONTRACT,
      },
    );
  });

  it("gives collections view precedence over address", () => {
    assert.deepEqual(
      resolveGalleryDeepLink(`?view=collections&address=${WALLET}`),
      { type: "collections" },
    );
  });

  it("gives address precedence over view=wallet", () => {
    assert.deepEqual(
      resolveGalleryDeepLink(`?view=wallet&address=${WALLET}`),
      { type: "wallet", address: WALLET },
    );
  });

  it("supports browser back/forward style search strings", () => {
    assert.equal(resolveGalleryDeepLink("").type, "discover");
    assert.equal(
      resolveGalleryDeepLink(`?view=collections`).type,
      "collections",
    );
    assert.equal(resolveGalleryDeepLink(`?view=wallet`).type, "none");
    assert.equal(
      resolveGalleryDeepLink(`?contract=${CONTRACT}`).type,
      "collection",
    );
    assert.equal(resolveGalleryDeepLink(`?address=${WALLET}`).type, "wallet");
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

  it("builds wallet idle view while clearing obsolete mode params", () => {
    assert.equal(
      buildWalletViewSearch(
        `?address=${WALLET}&contract=${CONTRACT}&utm=edu`,
      ),
      "?utm=edu&view=wallet",
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

  it("builds Discover home search by clearing mode params only", () => {
    assert.equal(
      buildHomeGallerySearch(
        `?address=${WALLET}&contract=${CONTRACT}&view=collections&utm=edu`,
      ),
      "?utm=edu",
    );
  });

  it("preserves unrelated query parameters across view switches", () => {
    assert.equal(
      buildHomeGallerySearch("?utm=edu&ref=nav&view=wallet"),
      "?utm=edu&ref=nav",
    );
    assert.equal(
      buildWalletViewSearch("?utm=edu&ref=nav&view=collections"),
      "?utm=edu&ref=nav&view=wallet",
    );
    assert.equal(
      buildCollectionsViewSearch("?utm=edu&ref=nav"),
      "?utm=edu&ref=nav&view=collections",
    );
  });
});

describe("resolveActiveNav", () => {
  it("highlights Discover for discover mode", () => {
    assert.equal(resolveActiveNav("discover"), "discover");
  });

  it("highlights Collections for directory and detail modes", () => {
    assert.equal(resolveActiveNav("collections"), "collections");
    assert.equal(resolveActiveNav("collection"), "collections");
  });

  it("highlights Wallet Gallery for wallet mode", () => {
    assert.equal(resolveActiveNav("wallet"), "wallet");
  });
});

describe("shouldSkipGalleryNav", () => {
  it("skips Discover when already on the Discover home URL", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "discover",
        mode: "discover",
        currentSearch: "",
      }),
      true,
    );
    assert.equal(
      shouldSkipGalleryNav({
        destination: "discover",
        mode: "discover",
        currentSearch: "?utm=edu",
      }),
      true,
    );
  });

  it("does not skip Discover from Wallet Gallery", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "discover",
        mode: "wallet",
        currentSearch: "?view=wallet",
      }),
      false,
    );
  });

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

  it("skips Wallet Gallery only when already on the wallet idle URL", () => {
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: "?view=wallet",
      }),
      true,
    );
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: "?utm=edu&view=wallet",
      }),
      true,
    );
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: "",
      }),
      false,
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
    assert.equal(
      shouldSkipGalleryNav({
        destination: "wallet",
        mode: "wallet",
        currentSearch: "?utm=edu&view=wallet&ref=nav",
      }),
      true,
    );
  });
});
