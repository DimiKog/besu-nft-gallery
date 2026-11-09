import type { FeaturedCollection } from "@/lib/featuredCollections";
import { getFeaturedCollectionImage } from "@/lib/discoverAssets";
import { DiscoverPicture } from "./DiscoverPicture";
import styles from "./FeaturedCollectionVisual.module.css";

type FeaturedCollectionVisualProps = {
  collection: FeaturedCollection;
};

/** Featured-card 3D illustration mapped from the local Discover asset set. */
export function FeaturedCollectionVisual({
  collection,
}: FeaturedCollectionVisualProps) {
  const asset = getFeaturedCollectionImage(collection.address);

  return (
    <div
      className={styles.root}
      aria-hidden="true"
      data-category={collection.category}
    >
      <div className={styles.glow} />
      {asset ? (
        <DiscoverPicture asset={asset} className={styles.picture} />
      ) : (
        <div className={styles.fallback} />
      )}
    </div>
  );
}
