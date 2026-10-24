"use client";

import { useState } from "react";
import { isValidEthereumAddress, normalizeAddressInput } from "@/lib/address";
import {
  BlockscoutApiError,
  fetchAllNftsByOwner,
} from "@/lib/blockscout/client";
import type { NftItem } from "@/lib/nft";
import { AddressForm } from "./AddressForm";
import { NftGrid } from "./NftGrid";
import styles from "./GalleryApp.module.css";

type Status = "idle" | "loading" | "success" | "error";

const TEST_ADDRESS = "0x0E66db7d115B8F392eB7DFb8BaCb23675dAEB59E";

export function GalleryApp() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<NftItem[]>([]);
  const [queriedAddress, setQueriedAddress] = useState<string | null>(null);

  async function handleSubmit() {
    const normalized = normalizeAddressInput(address);

    if (!isValidEthereumAddress(normalized)) {
      setStatus("error");
      setErrorMessage(
        "Enter a valid Ethereum address (0x followed by 40 hexadecimal characters).",
      );
      setItems([]);
      setQueriedAddress(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setItems([]);
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

      <p className={styles.hint}>
        Try the test address{" "}
        <button
          type="button"
          className={styles.linkButton}
          disabled={status === "loading"}
          onClick={() => setAddress(TEST_ADDRESS)}
        >
          {TEST_ADDRESS}
        </button>
      </p>

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
          <NftGrid items={items} />
        </section>
      ) : null}
    </div>
  );
}
