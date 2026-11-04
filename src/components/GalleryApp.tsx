"use client";

import { useEffect, useRef, useState } from "react";
import { isValidEthereumAddress, normalizeAddressInput } from "@/lib/address";
import {
  BlockscoutApiError,
  fetchNftsByOwnerPage,
  isBlockscoutAbortError,
  shouldFetchNextPage,
  type BlockscoutPageParams,
} from "@/lib/blockscout/client";
import type { NftItem } from "@/lib/nft";
import { AddressForm } from "./AddressForm";
import { NftDetailsModal } from "./NftDetailsModal";
import { NftGrid } from "./NftGrid";
import styles from "./GalleryApp.module.css";

type Status = "idle" | "loading" | "success" | "error";

export function GalleryApp() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [items, setItems] = useState<NftItem[]>([]);
  const [queriedAddress, setQueriedAddress] = useState<string | null>(null);
  const [nextPageParams, setNextPageParams] =
    useState<BlockscoutPageParams | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);
  const detailsOpenerRef = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

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

  async function handleSubmit() {
    const normalized = normalizeAddressInput(address);

    if (!isValidEthereumAddress(normalized)) {
      abortRef.current?.abort();
      abortRef.current = null;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setStatus("error");
      setErrorMessage(
        "Enter a valid Ethereum address (0x followed by 40 hexadecimal characters).",
      );
      setLoadMoreError(null);
      setItems([]);
      setNextPageParams(null);
      setQueriedAddress(null);
      clearSelection();
      return;
    }

    const signal = beginRequest();
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setStatus("loading");
    setErrorMessage(null);
    setLoadMoreError(null);
    setItems([]);
    setNextPageParams(null);
    clearSelection();
    setQueriedAddress(normalized);

    try {
      const page = await fetchNftsByOwnerPage(normalized, { signal });
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

  async function handleLoadMore() {
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
  }

  const showLoadMore =
    status === "success" &&
    items.length > 0 &&
    shouldFetchNextPage(nextPageParams, false);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Besu NFT Gallery</h1>
        <p className={styles.subtitle}>
          Read-only NFT viewer for Besu Edu-Net. Enter a wallet address to list
          ERC-721 and ERC-1155 tokens owned by that address.
        </p>
      </header>

      <AddressForm
        value={address}
        disabled={status === "loading"}
        onChange={setAddress}
        onSubmit={handleSubmit}
      />

      {status === "loading" ? (
        <p className={styles.status} role="status">
          Loading NFTs from Blockscout…
        </p>
      ) : null}

      {status === "error" && errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {status === "success" && items.length === 0 ? (
        <p className={styles.status} role="status">
          No NFTs found for {queriedAddress}.
        </p>
      ) : null}

      {status === "success" && items.length > 0 ? (
        <section className={styles.results} aria-live="polite">
          <p className={styles.status}>
            {items.length} NFT{items.length === 1 ? "" : "s"} for{" "}
            <span className={styles.mono}>{queriedAddress}</span>
          </p>
          <NftGrid items={items} onSelect={handleSelectNft} />

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
        />
      ) : null}
    </div>
  );
}
