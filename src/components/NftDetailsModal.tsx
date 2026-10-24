"use client";

import { useEffect, useId, useRef } from "react";
import type { NftItem } from "@/lib/nft";
import {
  buildBlockscoutTokenInstanceUrl,
  getNftDisplayName,
  shouldShowBalance,
} from "@/lib/nftDisplay";
import { NftMedia } from "./NftMedia";
import styles from "./NftDetailsModal.module.css";

type NftDetailsModalProps = {
  nft: NftItem;
  onClose: () => void;
};

export function NftDetailsModal({ nft, onClose }: NftDetailsModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const title = getNftDisplayName(nft);
  const showBalance = shouldShowBalance(nft);
  const blockscoutUrl = buildBlockscoutTokenInstanceUrl(
    nft.contractAddress,
    nft.tokenId,
  );

  useEffect(() => {
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close details"
        onClick={onClose}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.dialogHeader}>
          <h2 id={titleId} className={styles.dialogTitle}>
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className={styles.content}>
          <NftMedia
            nft={nft}
            alt={title}
            className={styles.media}
            imageClassName={styles.image}
          />

          <div className={styles.fields}>
            <p className={styles.field}>
              <span className={styles.label}>Collection</span>
              <span>
                {nft.collectionName ?? "Unknown collection"}
                {nft.collectionSymbol ? ` (${nft.collectionSymbol})` : null}
              </span>
            </p>

            {nft.description ? (
              <p className={styles.field}>
                <span className={styles.label}>Description</span>
                <span className={styles.description}>{nft.description}</span>
              </p>
            ) : null}

            <p className={styles.field}>
              <span className={styles.label}>Token ID</span>
              <span className={styles.mono}>#{nft.tokenId}</span>
            </p>

            <p className={styles.field}>
              <span className={styles.label}>Standard</span>
              <span>{nft.tokenType}</span>
            </p>

            {showBalance ? (
              <p className={styles.field}>
                <span className={styles.label}>Balance</span>
                <span>{nft.balance}</span>
              </p>
            ) : null}

            <p className={styles.field}>
              <span className={styles.label}>Contract</span>
              <span className={styles.mono}>{nft.contractAddress}</span>
            </p>

            {nft.attributes.length > 0 ? (
              <div className={styles.field}>
                <span className={styles.label}>Attributes</span>
                <dl className={styles.attributes}>
                  {nft.attributes.map((attribute, index) => (
                    <div
                      key={`${attribute.traitType}-${index}`}
                      className={styles.attributeRow}
                    >
                      <dt>{attribute.traitType}</dt>
                      <dd>{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            <div className={styles.links}>
              {nft.externalUrl ? (
                <a
                  className={styles.link}
                  href={nft.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  External link
                </a>
              ) : null}
              <a
                className={styles.link}
                href={blockscoutUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Blockscout
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
