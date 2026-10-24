"use client";

import type { NftItem } from "@/lib/nft";
import { getNftDisplayName, shouldShowBalance } from "@/lib/nftDisplay";
import { NftMedia } from "./NftMedia";
import styles from "./NftCard.module.css";

type NftCardProps = {
  nft: NftItem;
  onSelect: (nft: NftItem, trigger: HTMLButtonElement) => void;
};

export function NftCard({ nft, onSelect }: NftCardProps) {
  const title = getNftDisplayName(nft);
  const showBalance = shouldShowBalance(nft);

  return (
    <article className={styles.card}>
      <NftMedia nft={nft} alt={title} className={styles.media} />
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>{title}</h2>
          <span className={styles.badge}>{nft.tokenType}</span>
        </div>
        <p className={styles.meta}>
          {nft.collectionName ?? "Unknown collection"}
        </p>
        <p className={styles.meta}>
          #{nft.tokenId}
          {showBalance ? ` · balance ${nft.balance}` : null}
        </p>
        <button
          type="button"
          className={styles.detailsButton}
          onClick={(event) => onSelect(nft, event.currentTarget)}
        >
          View details
        </button>
      </div>
    </article>
  );
}
