import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  BlockscoutApiError,
  fetchCollectionDetails,
  fetchCollectionInstance,
  fetchCollectionInstancesPage,
  fetchNftCollectionsPage,
  isBlockscoutAbortError,
} from "./client";

const COLLECTION = {
  address: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
  address_hash: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
  name: "Blockchain &amp; DLT Technologies Starter",
  symbol: "DLT-START",
  type: "ERC-721",
  holders: "58",
  holders_count: "58",
  total_supply: null,
  icon_url: null,
};

const INSTANCE = {
  id: "58",
  token_type: "ERC-721",
  image_url: "https://example.com/nft.png",
  metadata: {
    name: "Course Starter",
    description: "Enrollment NFT",
    image: "https://example.com/nft.png",
    attributes: [{ trait_type: "Network", value: "Besu EduNet" }],
  },
  owner: { hash: "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F" },
  token: {
    address_hash: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    name: "Blockchain &amp; DLT Technologies Starter",
    symbol: "DLT-START",
    type: "ERC-721",
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

describe("fetchNftCollectionsPage", () => {
  it("fetches ERC-721 collections and maps summaries", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async (input) => {
      const url = String(input);
      assert.match(url, /\/api\/v2\/tokens\?/);
      assert.match(url, /type=ERC-721/);
      assert.doesNotMatch(url, /holders_count=/);
      return jsonResponse({
        items: [COLLECTION],
        next_page_params: { holder_count: 58, items_count: 50 },
      });
    });

    const page = await fetchNftCollectionsPage("ERC-721");
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(page.items.length, 1);
    assert.equal(
      page.items[0]?.name,
      "Blockchain & DLT Technologies Starter",
    );
    assert.equal(page.items[0]?.holdersCount, 58);
    assert.equal(page.items[0]?.totalSupply, null);
    assert.deepEqual(page.nextPageParams, {
      holder_count: 58,
      items_count: 50,
    });
  });

  it("fetches ERC-1155 collections", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      assert.match(String(input), /type=ERC-1155/);
      return jsonResponse({
        items: [
          {
            ...COLLECTION,
            type: "ERC-1155",
            total_supply: "0",
            holders_count: "0",
          },
        ],
        next_page_params: null,
      });
    });

    const page = await fetchNftCollectionsPage("ERC-1155");
    assert.equal(page.items[0]?.tokenType, "ERC-1155");
    assert.equal(page.items[0]?.totalSupply, "0");
    assert.equal(page.items[0]?.holdersCount, 0);
    assert.equal(page.nextPageParams, null);
  });

  it("returns an empty list for empty results", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: [], next_page_params: null }),
    );
    const page = await fetchNftCollectionsPage("ERC-721");
    assert.deepEqual(page.items, []);
    assert.equal(page.nextPageParams, null);
  });

  it("maps missing items to an empty list", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: null, next_page_params: null }),
    );
    const page = await fetchNftCollectionsPage("ERC-721");
    assert.deepEqual(page.items, []);
  });

  it("applies and URL-encodes continuation cursors", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      const url = String(input);
      assert.match(url, /holder_count=58/);
      assert.match(url, /items_count=50/);
      assert.match(url, /filter=a\+b/);
      return jsonResponse({ items: [], next_page_params: null });
    });

    const page = await fetchNftCollectionsPage("ERC-721", {
      pageParams: {
        holder_count: 58,
        items_count: 50,
        filter: "a b",
      },
    });
    assert.equal(page.nextPageParams, null);
  });

  it("keeps the requested ERC-721 type when the cursor includes a conflicting type", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("type"), "ERC-721");
      assert.equal(url.searchParams.get("holder_count"), "58");
      assert.equal(url.searchParams.get("items_count"), "50");
      return jsonResponse({ items: [COLLECTION], next_page_params: null });
    });

    const page = await fetchNftCollectionsPage("ERC-721", {
      pageParams: {
        type: "ERC-1155",
        holder_count: 58,
        items_count: 50,
      },
    });
    assert.equal(page.items[0]?.tokenType, "ERC-721");
    assert.equal(page.nextPageParams, null);
  });

  it("preserves an empty page that still has a continuation cursor", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({
        items: [],
        next_page_params: { items_count: 50, holder_count: 1 },
      }),
    );

    const page = await fetchNftCollectionsPage("ERC-721");
    assert.deepEqual(page.items, []);
    assert.deepEqual(page.nextPageParams, {
      items_count: 50,
      holder_count: 1,
    });
  });

  it("treats empty next_page_params as end of pagination", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: [COLLECTION], next_page_params: {} }),
    );
    const page = await fetchNftCollectionsPage("ERC-721");
    assert.equal(page.nextPageParams, null);
  });

  it("throws on malformed payloads", async () => {
    mock.method(globalThis, "fetch", async () => jsonResponse(["nope"]));
    await assert.rejects(
      () => fetchNftCollectionsPage("ERC-721"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "invalid");
        return true;
      },
    );
  });

  it("throws on HTTP failures without retrying", async () => {
    let calls = 0;
    mock.method(globalThis, "fetch", async () => {
      calls += 1;
      return jsonResponse({ message: "error" }, 500);
    });

    await assert.rejects(
      () => fetchNftCollectionsPage("ERC-721"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "http");
        assert.equal(error.status, 500);
        return true;
      },
    );
    assert.equal(calls, 1);
  });
});

describe("fetchCollectionDetails", () => {
  it("validates the contract address before fetching", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      jsonResponse(COLLECTION),
    );

    await assert.rejects(
      () => fetchCollectionDetails("not-an-address"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "invalid");
        return true;
      },
    );
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it("normalizes collection details and distinguishes null vs zero supply", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      assert.match(
        String(input),
        /\/api\/v2\/tokens\/0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9$/,
      );
      return jsonResponse({
        ...COLLECTION,
        total_supply: "0",
        holders_count: "0",
      });
    });

    const details = await fetchCollectionDetails(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(details.totalSupply, "0");
    assert.equal(details.holdersCount, 0);
    assert.equal(details.name, "Blockchain & DLT Technologies Starter");
  });

  it("keeps absent supply as null", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({ ...COLLECTION, total_supply: null }),
    );
    const details = await fetchCollectionDetails(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(details.totalSupply, null);
  });
});

describe("fetchCollectionInstancesPage", () => {
  it("maps complete instance metadata into NftItem", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      const url = String(input);
      assert.match(
        url,
        /\/api\/v2\/tokens\/0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9\/instances/,
      );
      return jsonResponse({
        items: [INSTANCE],
        next_page_params: { unique_token: 57, items_count: 50 },
      });
    });

    const page = await fetchCollectionInstancesPage(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(page.items.length, 1);
    const nft = page.items[0];
    assert.ok(nft);
    assert.equal(nft.tokenId, "58");
    assert.equal(nft.name, "Course Starter");
    assert.equal(nft.description, "Enrollment NFT");
    assert.equal(nft.imageUrl, "https://example.com/nft.png");
    assert.deepEqual(nft.attributes, [
      { traitType: "Network", value: "Besu EduNet" },
    ]);
    assert.equal(
      nft.ownerAddress,
      "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F",
    );
    assert.equal(
      nft.collectionName,
      "Blockchain & DLT Technologies Starter",
    );
    assert.deepEqual(page.nextPageParams, {
      unique_token: 57,
      items_count: 50,
    });
  });

  it("handles missing metadata, image, and attributes", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({
        items: [
          {
            id: "1",
            metadata: null,
            image_url: null,
            media_url: null,
            owner: { hash: "0x1111111111111111111111111111111111111111" },
            token: {
              address_hash: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
              type: "ERC-721",
            },
          },
        ],
        next_page_params: null,
      }),
    );

    const page = await fetchCollectionInstancesPage(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    const nft = page.items[0];
    assert.ok(nft);
    assert.equal(nft.name, null);
    assert.equal(nft.description, null);
    assert.equal(nft.imageUrl, null);
    assert.deepEqual(nft.attributes, []);
    assert.equal(
      nft.ownerAddress,
      "0x1111111111111111111111111111111111111111",
    );
  });

  it("supports very large token IDs as strings", async () => {
    const largeId = "9007199254740993";
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({
        items: [
          {
            ...INSTANCE,
            id: largeId,
            metadata: { ...INSTANCE.metadata, name: "Big" },
          },
        ],
        next_page_params: null,
      }),
    );

    const page = await fetchCollectionInstancesPage(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(page.items[0]?.tokenId, largeId);
    assert.equal(
      page.items[0]?.id,
      `0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9-${largeId}`,
    );
  });

  it("applies instance pagination cursors", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      const url = String(input);
      assert.match(url, /unique_token=57/);
      assert.match(url, /items_count=50/);
      return jsonResponse({ items: [], next_page_params: null });
    });

    const page = await fetchCollectionInstancesPage(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
      { pageParams: { unique_token: 57, items_count: 50 } },
    );
    assert.deepEqual(page.items, []);
    assert.equal(page.nextPageParams, null);
  });

  it("rejects invalid contract addresses before fetching", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      jsonResponse({ items: [] }),
    );
    await assert.rejects(
      () => fetchCollectionInstancesPage("0x123"),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "invalid");
        return true;
      },
    );
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("fetchCollectionInstance", () => {
  it("fetches and normalizes a single instance", async () => {
    mock.method(globalThis, "fetch", async (input) => {
      assert.match(
        String(input),
        /\/api\/v2\/tokens\/0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9\/instances\/58$/,
      );
      return jsonResponse(INSTANCE);
    });

    const nft = await fetchCollectionInstance(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
      "58",
    );
    assert.equal(nft.tokenId, "58");
    assert.equal(nft.name, "Course Starter");
    assert.equal(
      nft.ownerAddress,
      "0x05CFF42Fa58D7cb438FFC9182D6865d39622c50F",
    );
  });

  it("URL-encodes large string token IDs without Number coercion", async () => {
    const largeId = "9007199254740993";
    mock.method(globalThis, "fetch", async (input) => {
      assert.match(String(input), new RegExp(`/instances/${largeId}$`));
      return jsonResponse({ ...INSTANCE, id: largeId });
    });

    const nft = await fetchCollectionInstance(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
      largeId,
    );
    assert.equal(nft.tokenId, largeId);
  });

  it("rejects empty token IDs before fetching", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      jsonResponse(INSTANCE),
    );
    await assert.rejects(
      () =>
        fetchCollectionInstance(
          "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
          "  ",
        ),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "invalid");
        return true;
      },
    );
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it("falls back to the request contract when token info is missing", async () => {
    mock.method(globalThis, "fetch", async () =>
      jsonResponse({
        id: "7",
        metadata: { name: "Solo" },
        token: null,
        owner: null,
      }),
    );

    const nft = await fetchCollectionInstance(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
      "7",
    );
    assert.equal(
      nft.contractAddress,
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    );
    assert.equal(nft.ownerAddress, null);
    assert.equal(nft.name, "Solo");
  });
});

describe("collection API reliability", () => {
  it("surfaces abort separately from timeout", async () => {
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

    const pending = fetchNftCollectionsPage("ERC-721", {
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

  it("times out stalled collection requests", async () => {
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
      () => fetchNftCollectionsPage("ERC-721", { timeoutMs: 20 }),
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "timeout");
        assert.equal(isBlockscoutAbortError(error), false);
        return true;
      },
    );
  });

  it("classifies abort during JSON parsing as aborted", async () => {
    const controller = new AbortController();
    mock.method(globalThis, "fetch", async () => {
      return {
        ok: true,
        status: 200,
        async json() {
          return await new Promise<unknown>((_resolve, reject) => {
            const fail = () => {
              reject(new DOMException("Aborted", "AbortError"));
            };
            if (controller.signal.aborted) {
              fail();
              return;
            }
            controller.signal.addEventListener("abort", fail, { once: true });
          });
        },
      } as Response;
    });

    const pending = fetchCollectionDetails(
      "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
      { signal: controller.signal, timeoutMs: 5_000 },
    );
    controller.abort();

    await assert.rejects(
      () => pending,
      (error: unknown) => {
        assert.ok(error instanceof BlockscoutApiError);
        assert.equal(error.code, "aborted");
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
        fetchNftCollectionsPage("ERC-721", {
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
