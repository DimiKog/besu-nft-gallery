"use client";

import { useState } from "react";
import type { NftItem } from "@/lib/nft";
import styles from "./NftMedia.module.css";

type ImageAttempt = "primary" | "fallback" | "failed";

type NftMediaProps = {
  nft: Pick<NftItem, "imageUrl" | "imageFallbackUrl">;
  alt: string;
  className?: string;
  imageClassName?: string;
};

/** Shared image/fallback behavior for cards and details. */
export function NftMedia({
  nft,
  alt,
  className,
  imageClassName,
}: NftMediaProps) {
  const [attempt, setAttempt] = useState<ImageAttempt>("primary");

  const src =
    attempt === "primary"
      ? nft.imageUrl
      : attempt === "fallback"
        ? nft.imageFallbackUrl
        : null;

  return (
    <div className={className ?? styles.media}>
      {src ? (
        // Arbitrary Blockscout/IPFS hosts — plain img avoids next/image remote allowlists.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={imageClassName ?? styles.image}
          src={src}
          alt={alt}
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
  );
}
