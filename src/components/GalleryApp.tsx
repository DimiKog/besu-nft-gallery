"use client";

import { useRef, useState } from "react";
import { isValidEthereumAddress, normalizeAddressInput } from "@/lib/address";
import {
  BlockscoutApiError,
  fetchAllNftsByOwner,
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
  const [items, setItems] = useState<NftItem[]>([]);
  const [queriedAddress, setQueriedAddress] = useState<string | null>(null);
  const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);
  const detailsOpenerRef = useRef<HTMLButtonElement | null>(null);

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

  async function handleSubmit() {
    const normalized = normalizeAddressInput(address);

    if (!isValidEthereumAddress(normalized)) {
      setStatus("error");
      setErrorMessage(
        "Enter a valid Ethereum address (0x followed by 40 hexadecimal characters).",
      );
      setItems([]);
      setQueriedAddress(null);
      clearSelection();
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setItems([]);
    clearSelection();
    setQueriedAddress(normalized);

    try {
      const nfts = await fetchAllNftsByOwner(normalized);
      setItems(nfts);
      setStatus("success");
    } catch (error) {
      const message =
        error instanceof BlockscoutApiError
          ? error.message
          : "Something went wrong while loading NFTs.";
      setErrorMessage(message);
      setStatus("error");
      setItems([]);
      clearSelection();
    }
  }

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
