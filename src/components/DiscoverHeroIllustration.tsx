import { DISCOVER_HERO_IMAGE } from "@/lib/discoverAssets";
import { DiscoverPicture } from "./DiscoverPicture";
import styles from "./DiscoverHeroIllustration.module.css";

/** Hero 3D illustration for Discover (`hero-blockchain`). */
export function DiscoverHeroIllustration() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.glow} />
      <div className={styles.frame}>
        <DiscoverPicture
          asset={DISCOVER_HERO_IMAGE}
          className={styles.picture}
          priority
        />
      </div>
    </div>
  );
}
