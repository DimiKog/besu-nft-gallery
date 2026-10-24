import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSafeHttpUrl } from "./safeUrl";

describe("toSafeHttpUrl", () => {
  it("accepts http and https absolute URLs", () => {
    assert.equal(
      toSafeHttpUrl("https://example.com/path"),
      "https://example.com/path",
    );
    assert.equal(toSafeHttpUrl("http://example.com"), "http://example.com");
  });

  it("rejects relative, javascript, data, and invalid URLs", () => {
    assert.equal(toSafeHttpUrl("/relative"), null);
    assert.equal(toSafeHttpUrl("javascript:alert(1)"), null);
    assert.equal(toSafeHttpUrl("data:text/html,hi"), null);
    assert.equal(toSafeHttpUrl("not a url"), null);
    assert.equal(toSafeHttpUrl(""), null);
    assert.equal(toSafeHttpUrl(null), null);
  });
});
