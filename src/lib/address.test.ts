import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNavigableOwnerAddress,
  isValidEthereumAddress,
  normalizeAddressInput,
} from "./address";

const VALID = "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F";

describe("isValidEthereumAddress", () => {
  it("accepts canonical 0x-prefixed 40-hex addresses", () => {
    assert.equal(isValidEthereumAddress(VALID), true);
    assert.equal(isValidEthereumAddress(`  ${VALID}  `), true);
  });

  it("rejects malformed values", () => {
    assert.equal(isValidEthereumAddress("0x123"), false);
    assert.equal(isValidEthereumAddress("not-an-address"), false);
    assert.equal(isValidEthereumAddress(""), false);
  });
});

describe("isNavigableOwnerAddress", () => {
  it("allows View Owner's NFTs for valid owner addresses", () => {
    assert.equal(isNavigableOwnerAddress(VALID), true);
    assert.equal(isNavigableOwnerAddress(`  ${VALID}  `), true);
  });

  it("hides navigation for null, blank, and malformed owners", () => {
    assert.equal(isNavigableOwnerAddress(null), false);
    assert.equal(isNavigableOwnerAddress(undefined), false);
    assert.equal(isNavigableOwnerAddress(""), false);
    assert.equal(isNavigableOwnerAddress("   "), false);
    assert.equal(isNavigableOwnerAddress("0xbad"), false);
    assert.equal(isNavigableOwnerAddress("not-an-address"), false);
  });

  it("uses the same normalization as other address helpers", () => {
    assert.equal(
      isNavigableOwnerAddress(normalizeAddressInput(` ${VALID} `)),
      true,
    );
  });
});
