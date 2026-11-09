"use client";

import {
  FEATURED_SECTIONS,
  getFeaturedCollectionsByCategory,
} from "@/lib/featuredCollections";
import { FeaturedCollectionCard } from "./FeaturedCollectionCard";
import styles from "./DiscoverHome.module.css";

type DiscoverHomeProps = {
  onExploreCollections: () => void;
  onOpenWalletGallery: () => void;
  onSelectCollection: (contractAddress: string) => void;
};

export function DiscoverHome({
  onExploreCollections,
  onOpenWalletGallery,
  onSelectCollection,
}: DiscoverHomeProps) {
  return (
    <section className={styles.root} aria-label="Discover">
      <header className={styles.hero}>
        <h2 className={styles.heroTitle}>Explore NFTs on Besu Edu-Net</h2>
        <p className={styles.heroSubtitle}>
          Discover educational credentials, digital identities, achievements,
          and research applications built on a blockchain network for learning
          and experimentation.
        </p>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onExploreCollections}
          >
            Explore Collections
          </button>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={onOpenWalletGallery}
          >
            Wallet Gallery
          </button>
        </div>
      </header>

      <div className={styles.sections}>
        {FEATURED_SECTIONS.map((section) => {
          const collections = getFeaturedCollectionsByCategory(
            section.category,
          );
          return (
            <section
              key={section.id}
              className={styles.section}
              aria-labelledby={`discover-section-${section.id}`}
            >
              <div className={styles.sectionIntro}>
                <h3
                  id={`discover-section-${section.id}`}
                  className={styles.sectionTitle}
                >
                  {section.title}
                </h3>
                <p className={styles.sectionDescription}>
                  {section.description}
                </p>
              </div>
              <div className={styles.grid}>
                {collections.map((collection) => (
                  <FeaturedCollectionCard
                    key={collection.address.toLowerCase()}
                    collection={collection}
                    onExplore={onSelectCollection}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
