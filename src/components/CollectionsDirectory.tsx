"use client";

import { useEffect, useRef, useState } from "react";
import {
  BlockscoutApiError,
  fetchNftCollectionsPage,
  isBlockscoutAbortError,
} from "@/lib/blockscout/client";
import type { CollectionSummary } from "@/lib/collection";
import {
  appendUniqueCollections,
  applyStandardPageResult,
  createStandardPaginationState,
  isStandardEligibleForDirectoryLoadMore,
  shouldShowDirectoryLoadMore,
  shouldShowEmptyDirectoryMessage,
  type StandardPaginationState,
} from "@/lib/collectionsDirectory";
import { CollectionCard } from "./CollectionCard";
import styles from "./CollectionsDirectory.module.css";

type CollectionsDirectoryProps = {
  onSelectCollection: (contractAddress: string) => void;
};

type DirectoryStatus = "loading" | "ready" | "error";

function errorMessageFromUnknown(error: unknown, fallback: string): string {
  if (error instanceof BlockscoutApiError) {
    return error.message;
  }
  return fallback;
}

export function CollectionsDirectory({
  onSelectCollection,
}: CollectionsDirectoryProps) {
  const [status, setStatus] = useState<DirectoryStatus>("loading");
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [erc721, setErc721] = useState<StandardPaginationState>(
    createStandardPaginationState,
  );
  const [erc1155, setErc1155] = useState<StandardPaginationState>(
    createStandardPaginationState,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const erc721Ref = useRef(erc721);
  const erc1155Ref = useRef(erc1155);
  const collectionsRef = useRef(collections);

  useEffect(() => {
    erc721Ref.current = erc721;
  }, [erc721]);

  useEffect(() => {
    erc1155Ref.current = erc1155;
  }, [erc1155]);

  useEffect(() => {
    collectionsRef.current = collections;
  }, [collections]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  function beginRequest(): AbortSignal {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }

  async function loadInitial() {
    const requestSignal = beginRequest();
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setStatus("loading");
    setCollections([]);
    setErc721(createStandardPaginationState());
    setErc1155(createStandardPaginationState());

    const [result721, result1155] = await Promise.allSettled([
      fetchNftCollectionsPage("ERC-721", { signal: requestSignal }),
      fetchNftCollectionsPage("ERC-1155", { signal: requestSignal }),
    ]);

    if (requestSignal.aborted) {
      return;
    }

    let nextCollections: CollectionSummary[] = [];
    let next721 = createStandardPaginationState();
    let next1155 = createStandardPaginationState();
    let hadSuccess = false;

    if (result721.status === "fulfilled") {
      hadSuccess = true;
      nextCollections = appendUniqueCollections(
        nextCollections,
        result721.value.items,
      );
      next721 = applyStandardPageResult(
        next721,
        null,
        result721.value.nextPageParams,
      );
    } else if (!isBlockscoutAbortError(result721.reason)) {
      next721 = {
        ...next721,
        error: errorMessageFromUnknown(
          result721.reason,
          "Unable to load ERC-721 collections.",
        ),
      };
    }

    if (result1155.status === "fulfilled") {
      hadSuccess = true;
      nextCollections = appendUniqueCollections(
        nextCollections,
        result1155.value.items,
      );
      next1155 = applyStandardPageResult(
        next1155,
        null,
        result1155.value.nextPageParams,
      );
    } else if (!isBlockscoutAbortError(result1155.reason)) {
      next1155 = {
        ...next1155,
        error: errorMessageFromUnknown(
          result1155.reason,
          "Unable to load ERC-1155 collections.",
        ),
      };
    }

    setCollections(nextCollections);
    setErc721(next721);
    setErc1155(next1155);
    setStatus(hadSuccess ? "ready" : "error");
  }

  useEffect(() => {
    // Mount-only directory bootstrap (static export; client-side Blockscout fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- directory bootstrap
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function retryStandard(standard: "ERC-721" | "ERC-1155") {
    if (loadingMoreRef.current || status === "loading") {
      return;
    }

    const signal = beginRequest();
    const state =
      standard === "ERC-721" ? erc721Ref.current : erc1155Ref.current;
    const requested = state.cursor;
    const isInitialRetry = requested == null;

    if (isInitialRetry) {
      setStatus(collectionsRef.current.length === 0 ? "loading" : "ready");
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const page = await fetchNftCollectionsPage(standard, {
        pageParams: requested,
        signal,
      });
      if (signal.aborted) {
        return;
      }

      setCollections((current) =>
        appendUniqueCollections(current, page.items),
      );

      if (standard === "ERC-721") {
        setErc721((current) =>
          applyStandardPageResult(current, requested, page.nextPageParams),
        );
      } else {
        setErc1155((current) =>
          applyStandardPageResult(current, requested, page.nextPageParams),
        );
      }
      setStatus("ready");
    } catch (error) {
      if (isBlockscoutAbortError(error) || signal.aborted) {
        return;
      }
      const message = errorMessageFromUnknown(
        error,
        `Unable to load ${standard} collections.`,
      );
      if (standard === "ERC-721") {
        setErc721((current) => ({ ...current, error: message }));
      } else {
        setErc1155((current) => ({ ...current, error: message }));
      }
      if (collectionsRef.current.length === 0 && isInitialRetry) {
        setStatus("error");
      } else {
        setStatus("ready");
      }
    } finally {
      if (!signal.aborted) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }

  async function handleLoadMore() {
    if (loadingMoreRef.current) {
      return;
    }

    const state721 = erc721Ref.current;
    const state1155 = erc1155Ref.current;
    const request721 = isStandardEligibleForDirectoryLoadMore(state721)
      ? state721.cursor
      : null;
    const request1155 = isStandardEligibleForDirectoryLoadMore(state1155)
      ? state1155.cursor
      : null;

    if (request721 == null && request1155 == null) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const signal = beginRequest();
    const tasks: Array<Promise<void>> = [];

    if (request721 != null) {
      tasks.push(
        (async () => {
          try {
            const page = await fetchNftCollectionsPage("ERC-721", {
              pageParams: request721,
              signal,
            });
            if (signal.aborted) {
              return;
            }
            setCollections((current) =>
              appendUniqueCollections(current, page.items),
            );
            setErc721((current) =>
              applyStandardPageResult(
                current,
                request721,
                page.nextPageParams,
              ),
            );
          } catch (error) {
            if (isBlockscoutAbortError(error) || signal.aborted) {
              return;
            }
            const message = errorMessageFromUnknown(
              error,
              "Unable to load more ERC-721 collections.",
            );
            // Preserve cursor; do not record into requested-cursor history.
            setErc721((current) => ({ ...current, error: message }));
          }
        })(),
      );
    }

    if (request1155 != null) {
      tasks.push(
        (async () => {
          try {
            const page = await fetchNftCollectionsPage("ERC-1155", {
              pageParams: request1155,
              signal,
            });
            if (signal.aborted) {
              return;
            }
            setCollections((current) =>
              appendUniqueCollections(current, page.items),
            );
            setErc1155((current) =>
              applyStandardPageResult(
                current,
                request1155,
                page.nextPageParams,
              ),
            );
          } catch (error) {
            if (isBlockscoutAbortError(error) || signal.aborted) {
              return;
            }
            const message = errorMessageFromUnknown(
              error,
              "Unable to load more ERC-1155 collections.",
            );
            // Preserve cursor; do not record into requested-cursor history.
            setErc1155((current) => ({ ...current, error: message }));
          }
        })(),
      );
    }

    await Promise.all(tasks);

    if (!signal.aborted) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  const showLoadMore = shouldShowDirectoryLoadMore(erc721, erc1155);
  const showEmptyDirectory = shouldShowEmptyDirectoryMessage({
    status,
    collectionCount: collections.length,
    erc721,
    erc1155,
  });
  const hasContinuationCursor =
    erc721.cursor != null || erc1155.cursor != null;
  const partialErrors = [erc721.error, erc1155.error].filter(
    Boolean,
  ) as string[];
  const bothExhausted =
    status === "ready" &&
    !hasContinuationCursor &&
    collections.length > 0 &&
    !erc721.error &&
    !erc1155.error;

  return (
    <section className={styles.root} aria-label="All collections">
      <div className={styles.intro}>
        <h1 className={styles.heading}>All Collections</h1>
        <p className={styles.subtitle}>
          Dynamic directory of ERC-721 and ERC-1155 contracts indexed on Besu
          Edu-Net via Blockscout.
        </p>
      </div>

      {status === "loading" ? (
        <p className={styles.status} role="status">
          Loading collections from Blockscout…
        </p>
      ) : null}

      {status === "error" ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.error}>
            {erc721.error ||
              erc1155.error ||
              "Unable to load collections from Blockscout."}
          </p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => void loadInitial()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && partialErrors.length > 0 ? (
        <div className={styles.partialError} role="alert">
          <p className={styles.error}>{partialErrors.join(" ")}</p>
          <div className={styles.retryRow}>
            {erc721.error ? (
              <button
                type="button"
                className={styles.retryButton}
                disabled={loadingMore}
                onClick={() => void retryStandard("ERC-721")}
              >
                Retry ERC-721
              </button>
            ) : null}
            {erc1155.error ? (
              <button
                type="button"
                className={styles.retryButton}
                disabled={loadingMore}
                onClick={() => void retryStandard("ERC-1155")}
              >
                Retry ERC-1155
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showEmptyDirectory ? (
        <p className={styles.status} role="status">
          No collections are currently indexed on Blockscout.
        </p>
      ) : null}

      {status === "ready" && collections.length > 0 ? (
        <>
          <p className={styles.status}>
            {collections.length} collection
            {collections.length === 1 ? "" : "s"}
          </p>
          <div className={styles.grid}>
            {collections.map((collection) => (
              <CollectionCard
                key={collection.address.toLowerCase()}
                collection={collection}
                onSelect={onSelectCollection}
              />
            ))}
          </div>
        </>
      ) : null}

      {status === "ready" &&
      collections.length === 0 &&
      hasContinuationCursor &&
      partialErrors.length === 0 ? (
        <p className={styles.status} role="status">
          No collections on this page yet. Load more to continue.
        </p>
      ) : null}

      {status === "ready" && showLoadMore ? (
        <div className={styles.loadMore}>
          <button
            type="button"
            className={styles.loadMoreButton}
            disabled={loadingMore}
            aria-busy={loadingMore}
            onClick={() => void handleLoadMore()}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

      {bothExhausted ? (
        <p className={styles.status} role="status">
          No more collections to load.
        </p>
      ) : null}
    </section>
  );
}
