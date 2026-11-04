import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  BlockscoutApiError,
  fetchNftsByOwnerPage,
  isBlockscoutAbortError,
  normalizeNextPageParams,
  shouldFetchNextPage,
} from "./client";

const SAMPLE_ITEM = {
  id: "1",
  token_type: "ERC-721",
  value: "1",
  image_url: "https://example.com/a.png",
  token: {
    address_hash: "0x1111111111111111111111111111111111111111",
    name: "Test Collection",
    symbol: "TEST",
    type: "ERC-721",
  },
  metadata: {
    name: "Token One",
    description: "Desc",
    attributes: [],
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  mock.restoreAll();
});

describe("normalizeNextPageParams", () => {
  it("returns null for missing, empty, or malformed cursors", () => {
    assert.equal(normalizeNextPageParams(null), null);
    assert.equal(normalizeNextPageParams(undefined), null);
    assert.equal(normalizeNextPageParams([]), null);
    assert.equal(normalizeNextPageParams("cursor"), null);
    assert.equal(normalizeNextPageParams({}), null);
    assert.equal(normalizeNextPageParams({ nested: { a: 1 } }), null);
  });

  it("keeps string and number cursor fields", () => {
    assert.deepEqual(
      normalizeNextPageParams({
        token_id: "10",
        items_count: 50,
        ignored: true,
        also: { x: 1 },
      }),
      { token_id: "10", items_count: 50 },
    );
  });
});

describe("shouldFetchNextPage", () => {
  it("allows fetch only when a cursor exists and nothing is in flight", () => {
    assert.equal(shouldFetchNextPage({ token_id: "1" }, false), true);
    assert.equal(shouldFetchNextPage({ token_id: "1" }, true), false);
    assert.equal(shouldFetchNextPage(null, false), false);
    assert.equal(shouldFetchNextPage(null, true), false);
  });
});

describe("fetchNftsByOwnerPage", () => {
  it("fetches the first page and maps items", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async (input) => {
      const url = String(input);
      assert.match(url, /\/api\/v2\/addresses\/0xabc\/nft/);
      assert.match(url, /type=ERC-721%2CERC-1155/);
      assert.doesNotMatch(url, /token_id=/);
      return jsonResponse({
        items: [SAMPLE_ITEM],
        next_page_params: { token_id: "1", items_count: 50 },
      });
    });

    const page = await fetchNftsByOwnerPage("0xabc");
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]?.name, "Token One");
    assert.deepEqual(page.nextPageParams, {
      token_id: "1",
      items_count: 50,
    });
  });

  it("applies cursor params for the next page", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      const url = String(input);
      assert.match(url, /token_id=1/);
      assert.match(url, /items_count=50/);
      return jsonResponse({
        items: [
          {
            ...SAMPLE_ITEM,
            id: "2",
            metadata: { ...SAMPLE_ITEM.metadata, name: "Token Two" },
          },
        ],
        next_page_params: null,
      });
    });

    const page = await fetchNftsByOwnerPage("0xabc", {
      pageParams: { token_id: "1", items_count: 50 },
    });
    assert.equal(page.items[0]?.tokenId, "2");
    assert.equal(page.nextPageParams, null);
  });

  it("treats empty next_page_params as end of pagination", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: [SAMPLE_ITEM], next_page_params: {} }),
    );

    const page = await fetchNftsByOwnerPage("0xabc");
    assert.equal(page.nextPageParams, null);
  });

  it("treats malformed next_page_params as end of pagination", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({
        items: [SAMPLE_ITEM],
        next_page_params: "not-an-object",
      }),
    );

    const page = await fetchNftsByOwnerPage("0xabc");
    assert.equal(page.nextPageParams, null);
  });

  it("maps missing items to an empty list", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: null, next_page_params: null }),
    );

    const page = await fetchNftsByOwnerPage("0xabc");
    assert.deepEqual(page.items, []);
    assert.equal(page.nextPageParams, null);
  });

  it("throws on HTTP failures", async () => {
    mock.method(globalThis, "fetch", async () => jsonResponse({ message: "nope" }, 503));

    await assert.rejects(
      () => fetchNftsByOwnerPage("0xabc"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "http");
        assert.equal(error.status, 503);
        return true;
      },
    );
  });

  it("throws on malformed JSON payloads", async () => {
    mock.method(
      globalThis,
      "fetch",
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await assert.rejects(
      () => fetchNftsByOwnerPage("0xabc"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "invalid");
        return true;
      },
    );
  });

  it("throws on unexpected non-object JSON", async () => {
    mock.method(globalThis, "fetch", async () => jsonResponse(["oops"]));

    await assert.rejects(
      () => fetchNftsByOwnerPage("0xabc"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "invalid");
        return true;
      },
    );
  });

  it("surfaces cancellation separately from timeouts", async () => {
    const controller = new AbortController();
    mock.method(globalThis, "fetch", async (_input, init) => {
      const signal = init?.signal;
      assert.ok(signal);
      return await new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const pending = fetchNftsByOwnerPage("0xabc", {
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    controller.abort();

    await assert.rejects(
      () => pending,
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "aborted");
        assert.equal(isBlockscoutAbortError(error), true);
        return true;
      },
    );
  });

  it("times out stalled requests", async () => {
    mock.method(globalThis, "fetch", async (_input, init) => {
      const signal = init?.signal;
      assert.ok(signal);
      return await new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    await assert.rejects(
      () => fetchNftsByOwnerPage("0xabc", { timeoutMs: 20 }),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "timeout");
        assert.equal(isBlockscoutAbortError(error), false);
        return true;
      },
    );
  });

  it("rejects when the external signal is already aborted", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: [] }),
    );
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      () =>
        fetchNftsByOwnerPage("0xabc", {
          signal: controller.signal,
        }),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "aborted");
        return true;
      },
    );
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});
