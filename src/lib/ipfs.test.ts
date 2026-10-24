import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_IPFS_GATEWAY,
  normalizeIpfsGateway,
  resolveIpfsImageUrls,
  resolveToHttpUrl,
} from "./ipfs";

const PINATA = "https://gateway.pinata.cloud/ipfs/";
const CID = "bafkreifc7xa37qtrbuk2hrh7fspfrm6pgqpxeumrmg5u4mu45xe23hltre";
const CID_PATH = "bafybeigbyew2rogtthyv3qy3o37wg2t5sbirk4und3adn2pxmhdr2xkh7e/besuEduNFT.png";

describe("normalizeIpfsGateway", () => {
  it("adds a trailing slash when missing", () => {
    assert.equal(
      normalizeIpfsGateway("https://gateway.pinata.cloud/ipfs"),
      PINATA,
    );
  });

  it("keeps a single trailing slash", () => {
    assert.equal(normalizeIpfsGateway(PINATA), PINATA);
  });

  it("falls back to the default for empty input", () => {
    assert.equal(normalizeIpfsGateway("   "), DEFAULT_IPFS_GATEWAY);
  });
});

describe("resolveToHttpUrl", () => {
  it("rewrites ipfs://CID through the gateway", () => {
    assert.equal(resolveToHttpUrl(`ipfs://${CID}`, PINATA), `${PINATA}${CID}`);
  });

  it("rewrites ipfs://CID/path through the gateway", () => {
    assert.equal(
      resolveToHttpUrl(`ipfs://${CID_PATH}`, PINATA),
      `${PINATA}${CID_PATH}`,
    );
  });

  it("rewrites bare CID through the gateway", () => {
    assert.equal(resolveToHttpUrl(CID, PINATA), `${PINATA}${CID}`);
  });

  it("rewrites https://ipfs.io/ipfs/... through the gateway", () => {
    assert.equal(
      resolveToHttpUrl(`https://ipfs.io/ipfs/${CID}`, PINATA),
      `${PINATA}${CID}`,
    );
  });

  it("rewrites http://ipfs.io/ipfs/.../path through the gateway", () => {
    assert.equal(
      resolveToHttpUrl(`http://ipfs.io/ipfs/${CID_PATH}`, PINATA),
      `${PINATA}${CID_PATH}`,
    );
  });

  it("leaves ordinary https URLs unchanged", () => {
    const url =
      "https://mybackend.dimikog.org/assets/badge-images/blockchain-learner.png";
    assert.equal(resolveToHttpUrl(url, PINATA), url);
  });

  it("leaves ordinary http URLs unchanged", () => {
    const url = "http://example.com/image.png";
    assert.equal(resolveToHttpUrl(url, PINATA), url);
  });

  it("returns null for missing or empty refs", () => {
    assert.equal(resolveToHttpUrl(null, PINATA), null);
    assert.equal(resolveToHttpUrl(undefined, PINATA), null);
    assert.equal(resolveToHttpUrl("   ", PINATA), null);
  });

  it("does not duplicate slashes when gateway lacks a trailing slash", () => {
    assert.equal(
      resolveToHttpUrl(`ipfs://${CID}`, "https://gateway.pinata.cloud/ipfs"),
      `${PINATA}${CID}`,
    );
  });
});

describe("resolveIpfsImageUrls fallback derivation", () => {
  it("adds a CID-only fallback for ipfs://CID/path", () => {
    assert.deepEqual(resolveIpfsImageUrls(`ipfs://${CID_PATH}`, PINATA), {
      imageUrl: `${PINATA}${CID_PATH}`,
      imageFallbackUrl: `${PINATA}${CID_PATH.split("/")[0]}`,
    });
  });

  it("adds a CID-only fallback for https://ipfs.io/ipfs/CID/path", () => {
    assert.deepEqual(
      resolveIpfsImageUrls(`https://ipfs.io/ipfs/${CID_PATH}`, PINATA),
      {
        imageUrl: `${PINATA}${CID_PATH}`,
        imageFallbackUrl: `${PINATA}bafybeigbyew2rogtthyv3qy3o37wg2t5sbirk4und3adn2pxmhdr2xkh7e`,
      },
    );
  });

  it("adds a CID-only fallback for bare CID/path", () => {
    assert.deepEqual(resolveIpfsImageUrls(CID_PATH, PINATA), {
      imageUrl: `${PINATA}${CID_PATH}`,
      imageFallbackUrl: `${PINATA}bafybeigbyew2rogtthyv3qy3o37wg2t5sbirk4und3adn2pxmhdr2xkh7e`,
    });
  });

  it("does not add a fallback for CID-only refs", () => {
    assert.deepEqual(resolveIpfsImageUrls(`ipfs://${CID}`, PINATA), {
      imageUrl: `${PINATA}${CID}`,
      imageFallbackUrl: null,
    });
  });

  it("does not add a fallback for ordinary https URLs", () => {
    const url =
      "https://mybackend.dimikog.org/assets/badge-images/blockchain-learner.png";
    assert.deepEqual(resolveIpfsImageUrls(url, PINATA), {
      imageUrl: url,
      imageFallbackUrl: null,
    });
  });

  it("returns nulls for missing refs", () => {
    assert.deepEqual(resolveIpfsImageUrls(null, PINATA), {
      imageUrl: null,
      imageFallbackUrl: null,
    });
  });
});
