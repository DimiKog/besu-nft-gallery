"use client";

import { useEffect, useRef, useState } from "react";
import {
  isNavigableOwnerAddress,
  isValidEthereumAddress,
  normalizeAddressInput,
} from "@/lib/address";
import { shouldApplyDeepLinkBootstrap } from "@/lib/addressQuery";
import {
  BlockscoutApiError,
  fetchCollectionDetails,
  fetchCollectionInstancesPage,
  fetchNftsByOwnerPage,
  isBlockscoutAbortError,
  shouldFetchNextPage,
  type BlockscoutPageParams,
} from "@/lib/blockscout/client";
import type { CollectionDetails } from "@/lib/collection";
import {
  buildHomeGallerySearch,
  buildWalletGallerySearch,
  resolveGalleryDeepLink,
} from "@/lib/galleryQuery";
import type { NftItem } from "@/lib/nft";
import {
  appendUniqueNfts,
  createRequestedCursorHistory,
  rememberRequestedCursor,
  resolveContinuationCursor,
  shouldShowCollectionLoadMore,
  type RequestedCursorHistory,
} from "@/lib/nftPagination";
import { AddressForm } from "./AddressForm";
import { CollectionHeader } from "./CollectionHeader";
import { NftDetailsModal } from "./NftDetailsModal";
import { NftGrid } from "./NftGrid";
import styles from "./GalleryApp.module.css";

type Status = "idle" | "loading" | "success" | "error";
type GalleryMode = "wallet" | "collection";

const INVALID_ADDRESS_MESSAGE =
  "Enter a valid Ethereum address (0x followed by 40 hexadecimal characters).";

const INVALID_CONTRACT_MESSAGE =
  "Enter a valid contract address (0x followed by 40 hexadecimal characters).";

function replaceGalleryUrl(search: string) {
  const path = `${window.location.pathname}${search}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", path);
}

function pushGalleryUrl(search: string) {
  const path = `${window.location.pathname}${search}${window.location.hash}`;
  window.history.pushState(window.history.state, "", path);
}

export function GalleryApp() {
  const [mode, setMode] = useState<GalleryMode>("wallet");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [items, setItems] = useState<NftItem[]>([]);
  const [queriedAddress, setQueriedAddress] = useState<string | null>(null);
  const [queriedContract, setQueriedContract] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [nextPageParams, setNextPageParams] =
    useState<BlockscoutPageParams | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);
  const detailsOpenerRef = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  /** Requested cursors for the active collection pagination session. */
  const collectionCursorHistoryRef = useRef<RequestedCursorHistory>(
    createRequestedCursorHistory(),
  );
  /** Once true, mount deep-link bootstrap must not apply (manual search wins). */
  const userHasInitiatedSearchRef = useRef(false);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  function clearSelection(options?: { restoreFocus?: boolean }) {
    const opener = detailsOpenerRef.current;
    detailsOpenerRef.current = null;
    setSelectedNft(null);

    if (options?.restoreFocus && opener) {
      requestAnimationFrame(() => {
        opener.focus();
      });
    }
  }

  function handleSelectNft(nft: NftItem, trigger: HTMLButtonElement) {
    detailsOpenerRef.current = trigger;
    setSelectedNft(nft);
  }

  function beginRequest(): AbortSignal {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }

  function resetSharedResults() {
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setErrorMessage(null);
    setLoadMoreError(null);
    setItems([]);
    setNextPageParams(null);
    collectionCursorHistoryRef.current = createRequestedCursorHistory();
    clearSelection();
  }

  function showInvalidWalletAddress(rawAddress: string) {
    abortRef.current?.abort();
    abortRef.current = null;
    resetSharedResults();
    setMode("wallet");
    setAddress(rawAddress);
    setStatus("error");
    setErrorMessage(INVALID_ADDRESS_MESSAGE);
    setQueriedAddress(null);
    setQueriedContract(null);
    setCollection(null);
  }

  function showInvalidContract(rawContract: string) {
    abortRef.current?.abort();
    abortRef.current = null;
    resetSharedResults();
    setMode("collection");
    setStatus("error");
    setErrorMessage(INVALID_CONTRACT_MESSAGE);
    setQueriedAddress(null);
    setQueriedContract(null);
    setCollection(null);
    setAddress(rawContract);
  }

  async function loadWalletFirstPage(normalizedAddress: string) {
    const signal = beginRequest();
    resetSharedResults();
    setMode("wallet");
    setAddress(normalizedAddress);
    setStatus("loading");
    setQueriedAddress(normalizedAddress);
    setQueriedContract(null);
    setCollection(null);

    try {
      const page = await fetchNftsByOwnerPage(normalizedAddress, { signal });
      if (signal.aborted) {
        return;
      }
      setItems(page.items);
      setNextPageParams(page.nextPageParams);
      setStatus("success");
    } catch (error) {
      if (isBlockscoutAbortError(error) || signal.aborted) {
        return;
      }
      const message =
        error instanceof BlockscoutApiError
          ? error.message
          : "Something went wrong while loading NFTs.";
      setErrorMessage(message);
      setStatus("error");
      setItems([]);
      setNextPageParams(null);
      clearSelection();
    }
  }

  async function loadCollectionFirstPage(normalizedContract: string) {
    const signal = beginRequest();
    resetSharedResults();
    setMode("collection");
    setStatus("loading");
    setQueriedContract(normalizedContract);
    setQueriedAddress(null);
    setCollection(null);
    setAddress("");

    try {
      const [details, page] = await Promise.all([
        fetchCollectionDetails(normalizedContract, { signal }),
        fetchCollectionInstancesPage(normalizedContract, { signal }),
      ]);
      if (signal.aborted) {
        return;
      }
      setCollection(details);
      setItems(page.items);
      setNextPageParams(
        resolveContinuationCursor(
          null,
          page.nextPageParams,
          collectionCursorHistoryRef.current,
        ),
      );
      setStatus("success");
    } catch (error) {
      if (isBlockscoutAbortError(error) || signal.aborted) {
        return;
      }
      const message =
        error instanceof BlockscoutApiError
          ? error.message
          : "Something went wrong while loading this collection.";
      setErrorMessage(message);
      setStatus("error");
      setCollection(null);
      setItems([]);
      setNextPageParams(null);
      clearSelection();
    }
  }

  function applyDeepLink(
    search: string,
    options?: { allowBootstrapGate?: boolean },
  ) {
    const allowBootstrapGate = options?.allowBootstrapGate ?? false;
    if (
      allowBootstrapGate &&
      !shouldApplyDeepLinkBootstrap(userHasInitiatedSearchRef.current)
    ) {
      return;
    }

    const action = resolveGalleryDeepLink(search);
    if (action.type === "none") {
      return;
    }
    if (action.type === "collection-invalid") {
      showInvalidContract(action.raw);
      return;
    }
    if (action.type === "collection") {
      void loadCollectionFirstPage(action.contract);
      return;
    }
    if (action.type === "wallet-invalid") {
      showInvalidWalletAddress(action.raw);
      return;
    }
    void loadWalletFirstPage(action.address);
  }

  useEffect(() => {
    // Deep-link mount sync: URL → gallery state (static export; no SSR searchParams).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deep-link bootstrap
    applyDeepLink(window.location.search, { allowBootstrapGate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPopState() {
      userHasInitiatedSearchRef.current = false;
      const action = resolveGalleryDeepLink(window.location.search);
      if (action.type === "none") {
        abortRef.current?.abort();
        abortRef.current = null;
        resetSharedResults();
        setMode("wallet");
        setStatus("idle");
        setAddress("");
        setQueriedAddress(null);
        setQueriedContract(null);
        setCollection(null);
        return;
      }
      applyDeepLink(window.location.search);
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    userHasInitiatedSearchRef.current = true;

    const normalized = normalizeAddressInput(address);

    if (!isValidEthereumAddress(normalized)) {
      showInvalidWalletAddress(address);
      return;
    }

    replaceGalleryUrl(
      buildWalletGallerySearch(window.location.search, normalized),
    );
    await loadWalletFirstPage(normalized);
  }

  function handleBackToWalletGallery() {
    userHasInitiatedSearchRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    resetSharedResults();
    setMode("wallet");
    setStatus("idle");
    setAddress("");
    setQueriedAddress(null);
    setQueriedContract(null);
    setCollection(null);
    pushGalleryUrl(buildHomeGallerySearch(window.location.search));
  }

  function handleViewOwnerNfts(ownerAddress: string) {
    const normalized = normalizeAddressInput(ownerAddress);
    if (!isNavigableOwnerAddress(normalized)) {
      return;
    }

    userHasInitiatedSearchRef.current = true;
    clearSelection();
    pushGalleryUrl(
      buildWalletGallerySearch(window.location.search, normalized),
    );
    void loadWalletFirstPage(normalized);
  }

  async function handleLoadMore() {
    if (loadingMoreRef.current) {
      return;
    }

    if (mode === "wallet") {
      if (
        !queriedAddress ||
        !shouldFetchNextPage(nextPageParams, loadingMoreRef.current)
      ) {
        return;
      }

      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError(null);

      const signal = beginRequest();
      const pageParams = nextPageParams;

      try {
        const page = await fetchNftsByOwnerPage(queriedAddress, {
          pageParams,
          signal,
        });
        if (signal.aborted) {
          return;
        }
        setItems((current) => [...current, ...page.items]);
        setNextPageParams(page.nextPageParams);
      } catch (error) {
        if (isBlockscoutAbortError(error) || signal.aborted) {
          return;
        }
        const message =
          error instanceof BlockscoutApiError
            ? error.message
            : "Something went wrong while loading more NFTs.";
        setLoadMoreError(message);
      } finally {
        if (!signal.aborted) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
      return;
    }

    if (
      !queriedContract ||
      !shouldFetchNextPage(nextPageParams, loadingMoreRef.current)
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    const signal = beginRequest();
    const pageParams = nextPageParams;
    rememberRequestedCursor(collectionCursorHistoryRef.current, pageParams);

    try {
      const page = await fetchCollectionInstancesPage(queriedContract, {
        pageParams,
        signal,
      });
      if (signal.aborted) {
        return;
      }
      setItems((current) => appendUniqueNfts(current, page.items));
      setNextPageParams(
        resolveContinuationCursor(
          pageParams,
          page.nextPageParams,
          collectionCursorHistoryRef.current,
        ),
      );
    } catch (error) {
      if (isBlockscoutAbortError(error) || signal.aborted) {
        return;
      }
      const message =
        error instanceof BlockscoutApiError
          ? error.message
          : "Something went wrong while loading more NFTs.";
      setLoadMoreError(message);
    } finally {
      if (!signal.aborted) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }

  const isCollectionMode = mode === "collection";

  const showLoadMore = isCollectionMode
    ? shouldShowCollectionLoadMore(status, nextPageParams)
    : status === "success" &&
      items.length > 0 &&
      shouldFetchNextPage(nextPageParams, false);

  const showEmptyState =
    status === "success" && items.length === 0 && !showLoadMore;

  const showResultsSection =
    status === "success" && (items.length > 0 || showLoadMore);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Besu NFT Gallery</h1>
        <p className={styles.subtitle}>
          {isCollectionMode
            ? "Collection explorer for Besu Edu-Net. Browse NFTs from a smart contract without connecting a wallet."
            : "Read-only NFT viewer for Besu Edu-Net. Enter a wallet address to list ERC-721 and ERC-1155 tokens owned by that address."}
        </p>
      </header>

      {isCollectionMode ? (
        <div className={styles.modeBar}>
          <button
            type="button"
            className={styles.textButton}
            onClick={handleBackToWalletGallery}
          >
            Back to Wallet Gallery
          </button>
          {queriedContract ? (
            <p className={styles.status}>
              Collection{" "}
              <span className={styles.mono}>{queriedContract}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <AddressForm
          value={address}
          disabled={status === "loading"}
          onChange={setAddress}
          onSubmit={handleSubmit}
        />
      )}

      {status === "loading" ? (
        <p className={styles.status} role="status">
          {isCollectionMode
            ? "Loading collection from Blockscout…"
            : "Loading NFTs from Blockscout…"}
        </p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isCollectionMode && status === "success" && collection ? (
        <CollectionHeader collection={collection} />
      ) : null}

      {showEmptyState ? (
        <p className={styles.status} role="status">
          {isCollectionMode
            ? `No NFTs found in this collection${queriedContract ? ` (${queriedContract})` : ""}.`
            : `No NFTs found for ${queriedAddress}.`}
        </p>
      ) : null}

      {showResultsSection ? (
        <section className={styles.results} aria-live="polite">
          {items.length > 0 ? (
            <p className={styles.status}>
              {items.length} NFT{items.length === 1 ? "" : "s"}
              {isCollectionMode ? (
                <>
                  {" "}
                  in collection{" "}
                  <span className={styles.mono}>
                    {collection?.name ?? queriedContract}
                  </span>
                </>
              ) : (
                <>
                  {" "}
                  for <span className={styles.mono}>{queriedAddress}</span>
                </>
              )}
            </p>
          ) : (
            <p className={styles.status} role="status">
              No NFTs on this page yet. Load more to continue.
            </p>
          )}
          {items.length > 0 ? (
            <NftGrid items={items} onSelect={handleSelectNft} />
          ) : null}

          {showLoadMore ? (
            <div className={styles.loadMore}>
              {loadMoreError ? (
                <p className={styles.error} role="alert">
                  {loadMoreError}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.loadMoreButton}
                disabled={loadingMore}
                aria-busy={loadingMore}
                onClick={handleLoadMore}
              >
                {loadingMore
                  ? "Loading…"
                  : loadMoreError
                    ? "Retry"
                    : "Load more"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedNft ? (
        <NftDetailsModal
          key={selectedNft.id}
          nft={selectedNft}
          onClose={() => clearSelection({ restoreFocus: true })}
          onViewOwnerNfts={
            isNavigableOwnerAddress(selectedNft.ownerAddress)
              ? handleViewOwnerNfts
              : undefined
          }
        />
      ) : null}
    </div>
  );
}