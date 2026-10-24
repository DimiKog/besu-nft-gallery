"use client";

import { useState } from "react";
import type { NftItem } from "@/lib/nft";
import styles from "./NftCard.module.css";

type NftCardProps = {
  nft: NftItem;
};

type ImageAttempt = "primary" | "fallback" | "failed";

export function NftCard({ nft }: NftCardProps) {
  const [attempt, setAttempt] = useState<ImageAttempt>("primary");
  const title = nft.name ?? `Token #${nft.tokenId}`;

  const src =
    attempt === "primary"
      ? nft.imageUrl
      : attempt === "fallback"
        ? nft.imageFallbackUrl
        : null;

  const showImage = Boolean(src);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {showImage ? (
          // Arbitrary Blockscout/IPFS hosts — plain img avoids next/image remote allowlists.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.image}
            src={src!}
            alt={title}
            loading="lazy"
            onError={() => {
              if (
                attempt === "primary" &&
                nft.imageFallbackUrl &&
                nft.imageFallbackUrl !== nft.imageUrl
              ) {
                setAttempt("fallback");
                return;
              }
              setAttempt("failed");
            }}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            No image
          </div>
        )}
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.meta}>
          {nft.collectionName ?? "Unknown collection"}
          {nft.collectionSymbol ? ` (${nft.collectionSymbol})` : null}
        </p>
        <p className={styles.meta}>
          {nft.tokenType} · #{nft.tokenId}
          {nft.balance && nft.tokenType === "ERC-1155"
            ? ` · balance ${nft.balance}`
            : null}
        </p>
        <p className={styles.contract} title={nft.contractAddress}>
          {nft.contractAddress}
        </p>
      </div>
    </article>
  );
}
