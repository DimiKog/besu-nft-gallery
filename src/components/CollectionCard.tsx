"use client";

import type { CollectionSummary } from "@/lib/collection";
import {
  abbreviateAddress,
  collectionCardAccessibleName,
} from "@/lib/collectionsDirectory";
import styles from "./CollectionCard.module.css";

type CollectionCardProps = {
  collection: CollectionSummary;
  onSelect: (contractAddress: string) => void;
};

export function CollectionCard({ collection, onSelect }: CollectionCardProps) {
  const title = collection.name?.trim()
    ? collection.name
    : "Unnamed collection";
  const abbreviated = abbreviateAddress(collection.address);
  const accessibleName = collectionCardAccessibleName(
    collection.name,
    collection.address,
  );

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onSelect(collection.address)}
        aria-label={accessibleName}
      >
        <div className={styles.media} aria-hidden={collection.iconUrl ? undefined : true}>
          {collection.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Blockscout/IPFS icons
            <img
              src={collection.iconUrl}
              alt=""
              className={styles.icon}
              loading="lazy"
            />
          ) : (
            <span className={styles.iconFallback}>
              {collection.tokenType === "ERC-1155" ? "1155" : "721"}
            </span>
          )}
        </div>

        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          {collection.symbol ? (
            <p className={styles.symbol}>{collection.symbol}</p>
          ) : null}
          <p className={styles.meta}>
            <span className={styles.standard}>{collection.tokenType}</span>
            <span className={styles.mono} title={collection.address}>
              {abbreviated}
            </span>
          </p>
          <p className={styles.stats}>
            {collection.holdersCount != null ? (
              <span>{collection.holdersCount} holders</span>
            ) : (
              <span>Holders unknown</span>
            )}
            {collection.totalSupply != null ? (
              <span>Supply {collection.totalSupply}</span>
            ) : (
              <span>Supply unknown</span>
            )}
          </p>
        </div>
      </button>
    </article>
  );
}
