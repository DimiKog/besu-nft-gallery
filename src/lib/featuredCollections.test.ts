import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { isValidEthereumAddress } from "./address";
import {
  FEATURED_COLLECTIONS,
  FEATURED_SECTIONS,
  categoryLabel,
  featuredCardAccessibleName,
  getFeaturedCollectionsByCategory,
} from "./featuredCollections";
import { buildCollectionGallerySearch } from "./galleryQuery";

const require = createRequire(import.meta.url);

const WALLET_IDENTITY = "0xdDE6A59445538eA146a17Dd8745e7eA5288b1a31";
const AA_IDENTITY = "0x5e67E43cd14DaAb71B01A5268d209CB3b69dC175";
const CONCERT = "0x5B07CFc1f196ACE3cc947f89B8d83c9E776eE186";

describe("FEATURED_COLLECTIONS registry", () => {
  it("contains exactly seven curated collections", () => {
    assert.equal(FEATURED_COLLECTIONS.length, 7);
  });

  it("uses unique contract addresses", () => {
    const addresses = FEATURED_COLLECTIONS.map((entry) =>
      entry.address.toLowerCase(),
    );
    assert.equal(new Set(addresses).size, addresses.length);
  });

  it("uses complete valid Ethereum addresses", () => {
    for (const entry of FEATURED_COLLECTIONS) {
      assert.equal(
        isValidEthereumAddress(entry.address),
        true,
        `invalid address for ${entry.title}: ${entry.address}`,
      );
      assert.equal(entry.address.length, 42);
    }
  });

  it("assigns the expected categories", () => {
    assert.deepEqual(
      FEATURED_COLLECTIONS.map((entry) => entry.category),
      [
        "education",
        "education",
        "identity",
        "identity",
        "identity",
        "identity",
        "research",
      ],
    );
  });

  it("keeps wallet-based and AA Web3Edu Identity collections distinct", () => {
    const wallet = FEATURED_COLLECTIONS.find(
      (entry) => entry.address.toLowerCase() === WALLET_IDENTITY.toLowerCase(),
    );
    const aa = FEATURED_COLLECTIONS.find(
      (entry) => entry.address.toLowerCase() === AA_IDENTITY.toLowerCase(),
    );

    assert.ok(wallet);
    assert.ok(aa);
    assert.notEqual(wallet.address.toLowerCase(), aa.address.toLowerCase());
    assert.match(wallet.title, /Wallet/i);
    assert.match(aa.title, /Account Abstraction/i);
    assert.equal(wallet.category, "identity");
    assert.equal(aa.category, "identity");
  });

  it("includes the CoNSeRT Digital Twin contract with the 2026 description", () => {
    const concert = FEATURED_COLLECTIONS.find(
      (entry) => entry.address.toLowerCase() === CONCERT.toLowerCase(),
    );
    assert.ok(concert);
    assert.equal(concert.title, "CoNSeRT Digital Twin");
    assert.equal(concert.category, "research");
    assert.match(concert.description, /Researchers’ Night 2026/);
  });

  it("does not import Blockscout client APIs", () => {
    const modulePath = require.resolve("./featuredCollections.ts");
    const source = require("node:fs").readFileSync(modulePath, "utf8");
    assert.equal(source.includes("blockscout"), false);
    assert.equal(source.includes("fetch("), false);
  });
});

describe("featured Discover helpers", () => {
  it("groups collections by category for Discover sections", () => {
    assert.equal(FEATURED_SECTIONS.length, 3);
    assert.equal(getFeaturedCollectionsByCategory("education").length, 2);
    assert.equal(getFeaturedCollectionsByCategory("identity").length, 4);
    assert.equal(getFeaturedCollectionsByCategory("research").length, 1);
  });

  it("builds meaningful featured-card labels", () => {
    assert.equal(
      featuredCardAccessibleName("CoNSeRT Digital Twin", CONCERT),
      "Explore collection CoNSeRT Digital Twin, contract 0x5B07…E186",
    );
    assert.equal(categoryLabel("education"), "Education");
  });

  it("generates Collection Detail deep links for featured contracts", () => {
    for (const entry of FEATURED_COLLECTIONS) {
      assert.equal(
        buildCollectionGallerySearch("?utm=edu&view=collections", entry.address),
        `?utm=edu&contract=${entry.address}`,
      );
    }
  });
});
