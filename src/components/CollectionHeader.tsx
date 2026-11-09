"use client";

import { useState } from "react";
import type { CollectionDetails } from "@/lib/collection";
import { buildBlockscoutTokenUrl } from "@/lib/nftDisplay";
import styles from "./CollectionHeader.module.css";

type CollectionHeaderProps = {
  collection: CollectionDetails;
};

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const blockscoutUrl = buildBlockscoutTokenUrl(collection.address);
  const title = collection.name?.trim() ? collection.name : "Unnamed collection";

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(collection.address);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  return (
    <section className={styles.header} aria-labelledby="collection-title">
      <div className={styles.titleRow}>
        <h2 id="collection-title" className={styles.title}>
          {title}
        </h2>
        {collection.symbol ? (
          <span className={styles.symbol}>({collection.symbol})</span>
        ) : null}
      </div>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Contract</dt>
          <dd className={styles.mono}>{collection.address}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Standard</dt>
          <dd>{collection.tokenType}</dd>
        </div>
        {collection.holdersCount != null ? (
          <div className={styles.metaRow}>
            <dt>Holders</dt>
            <dd>{collection.holdersCount}</dd>
          </div>
        ) : null}
        {collection.totalSupply != null ? (
          <div className={styles.metaRow}>
            <dt>Total supply</dt>
            <dd className={styles.mono}>{collection.totalSupply}</dd>
          </div>
        ) : null}
      </dl>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleCopyAddress}
          aria-label="Copy contract address"
        >
          {copyStatus === "copied"
            ? "Copied"
            : copyStatus === "failed"
              ? "Copy failed"
              : "Copy address"}
        </button>
        <a
          className={styles.link}
          href={blockscoutUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View contract on Blockscout
          <span className={styles.srOnly}> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
