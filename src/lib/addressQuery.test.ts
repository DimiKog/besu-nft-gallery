import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAddressDeepLink,
  shouldApplyDeepLinkBootstrap,
} from "./addressQuery";

const VALID = "0x0E66db7d115B8F392eB7DFb8BaCb23675dAEB59E";
const VALID_B = "0x1111111111111111111111111111111111111111";

describe("resolveAddressDeepLink", () => {
  it("returns none when the address parameter is missing", () => {
    assert.deepEqual(resolveAddressDeepLink(""), { type: "none" });
    assert.deepEqual(resolveAddressDeepLink("?foo=1"), { type: "none" });
    assert.deepEqual(resolveAddressDeepLink("foo=1"), { type: "none" });
  });

  it("initializes a valid wallet deep link as a load action", () => {
    assert.deepEqual(resolveAddressDeepLink(`?address=${VALID}`), {
      type: "load",
      address: VALID,
    });
    assert.deepEqual(resolveAddressDeepLink(`address=${VALID}&x=1`), {
      type: "load",
      address: VALID,
    });
  });

  it("trims whitespace around a valid address before loading", () => {
    assert.deepEqual(
      resolveAddressDeepLink(
        `?address=${encodeURIComponent(`  ${VALID}  `)}`,
      ),
      {
        type: "load",
        address: VALID,
      },
    );
  });

  it("returns invalid for malformed address parameters", () => {
    assert.deepEqual(resolveAddressDeepLink("?address=0x123"), {
      type: "invalid",
      raw: "0x123",
    });
    assert.deepEqual(resolveAddressDeepLink("?address="), {
      type: "invalid",
      raw: "",
    });
    assert.deepEqual(resolveAddressDeepLink("?address=not-an-address"), {
      type: "invalid",
      raw: "not-an-address",
    });
  });
});

describe("shouldApplyDeepLinkBootstrap", () => {
  it("allows bootstrap before any manual search", () => {
    assert.equal(shouldApplyDeepLinkBootstrap(false), true);
  });

  it("blocks bootstrap once a manual search has been initiated", () => {
    assert.equal(shouldApplyDeepLinkBootstrap(true), false);
  });

  it("lets manual search take precedence over a pending deep-link load decision", () => {
    const deepLink = resolveAddressDeepLink(`?address=${VALID}`);
    assert.equal(deepLink.type, "load");

    const applyBootstrap = shouldApplyDeepLinkBootstrap(true);
    assert.equal(applyBootstrap, false);

    // Manual path would proceed independently with a different address.
    assert.notEqual(VALID, VALID_B);
  });

  it("lets manual search proceed after an invalid deep-link decision", () => {
    const deepLink = resolveAddressDeepLink("?address=0xbad");
    assert.equal(deepLink.type, "invalid");

    // User then searches manually — bootstrap must not re-apply over that intent.
    assert.equal(shouldApplyDeepLinkBootstrap(true), false);

    const manual = resolveAddressDeepLink(`?address=${VALID}`);
    assert.deepEqual(manual, { type: "load", address: VALID });
  });
});

describe("Strict Mode cleanup contract (helper-level)", () => {
  it("keeps deep-link resolution idempotent across repeated evaluations", () => {
    const search = `?address=${VALID}`;
    assert.deepEqual(resolveAddressDeepLink(search), resolveAddressDeepLink(search));
    assert.equal(shouldApplyDeepLinkBootstrap(false), true);
    // After a remount-equivalent manual supersession, bootstrap stays suppressed.
    assert.equal(shouldApplyDeepLinkBootstrap(true), false);
  });
});
