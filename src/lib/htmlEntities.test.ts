import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeBasicHtmlEntities } from "./htmlEntities";

describe("decodeBasicHtmlEntities", () => {
  it("decodes common named entities", () => {
    assert.equal(
      decodeBasicHtmlEntities("Blockchain &amp; Web3 Certificate"),
      "Blockchain & Web3 Certificate",
    );
    assert.equal(decodeBasicHtmlEntities("&lt;tag&gt;"), "<tag>");
    assert.equal(decodeBasicHtmlEntities("&quot;quoted&quot;"), '"quoted"');
    assert.equal(decodeBasicHtmlEntities("it&#39;s"), "it's");
  });

  it("leaves plain text unchanged", () => {
    assert.equal(decodeBasicHtmlEntities("Besu Edu-Net"), "Besu Edu-Net");
  });
});
