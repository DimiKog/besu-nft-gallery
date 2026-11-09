import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { FEATURED_COLLECTIONS } from "./featuredCollections";
import {
  DISCOVER_HERO_IMAGE,
  getFeaturedCollectionImage,
} from "./discoverAssets";

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");
const SOURCE_ROOT = path.resolve(process.cwd(), "assets/source/discover");

function publicPath(urlPath: string): string {
  return path.join(PUBLIC_ROOT, urlPath.replace(/^\//, ""));
}

describe("discoverAssets", () => {
  it("maps all seven featured collections to distinct published WebP assets", () => {
    const paths = new Set<string>();
    for (const entry of FEATURED_COLLECTIONS) {
      const asset = getFeaturedCollectionImage(entry.address);
      assert.ok(asset, `missing asset for ${entry.title}`);
      assert.match(asset.src, /\.webp$/);
      paths.add(asset.src);
      assert.equal(existsSync(publicPath(asset.src)), true);
    }
    assert.equal(paths.size, 7);
  });

  it("publishes hero WebP and keeps source PNGs outside public/", () => {
    assert.match(DISCOVER_HERO_IMAGE.src, /\.webp$/);
    assert.equal(existsSync(publicPath(DISCOVER_HERO_IMAGE.src)), true);

    const sourcePngs = [
      "hero-blockchain.png",
      "education-starter.png",
      "education-course.png",
      "identity-wallet.png",
      "identity-aa.png",
      "certificate.png",
      "poe-reward.png",
      "research-twin.png",
      "dao-governance.png",
    ];
    for (const name of sourcePngs) {
      assert.equal(
        existsSync(path.join(SOURCE_ROOT, name)),
        true,
        `missing source asset ${name}`,
      );
      assert.equal(
        existsSync(path.join(PUBLIC_ROOT, "images/discover", name)),
        false,
        `source PNG must not be published: ${name}`,
      );
    }

    assert.equal(
      [...FEATURED_COLLECTIONS].some((entry) =>
        getFeaturedCollectionImage(entry.address)?.src.includes(
          "dao-governance",
        ),
      ),
      false,
    );
  });
});
