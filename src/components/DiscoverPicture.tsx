import type { DiscoverImageAsset } from "@/lib/discoverAssets";
import styles from "./DiscoverPicture.module.css";

type DiscoverPictureProps = {
  asset: DiscoverImageAsset;
  className?: string;
  /** Eager for hero; lazy for below-the-fold cards. */
  priority?: boolean;
};

/**
 * Static-export-safe local WebP image.
 * Avoids next/image server optimization and does not publish PNG fallbacks.
 */
export function DiscoverPicture({
  asset,
  className,
  priority = false,
}: DiscoverPictureProps) {
  return (
    <span className={className}>
      {/* Static export: local WebP from public/; next/image optimizer not used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.image}
        src={asset.src}
        alt=""
        width={asset.width}
        height={asset.height}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </span>
  );
}
