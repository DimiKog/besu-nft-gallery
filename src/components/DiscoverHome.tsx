"use client";

import {
  FEATURED_SECTIONS,
  getFeaturedCollectionsByCategory,
} from "@/lib/featuredCollections";
import { DiscoverHeroIllustration } from "./DiscoverHeroIllustration";
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
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>BESU EDU-NET · NFT EXPLORER</p>
          <h1 className={styles.heroTitle}>
            Blockchain applications in{" "}
            <span className={styles.heroAccent}>education &amp; research</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Explore digital identities, learning achievements, educational
            credentials, and research assets issued on Besu Edu-Net.
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
              Browse by Wallet
            </button>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <DiscoverHeroIllustration />
        </div>
      </header>

      <div className={styles.sections}>
        {FEATURED_SECTIONS.map((section) => {
          const collections = getFeaturedCollectionsByCategory(
            section.category,
          );
          const layout =
            section.category === "identity" ? "vertical" : "horizontal";
          const gridClass =
            section.category === "education"
              ? styles.gridEducation
              : section.category === "identity"
                ? styles.gridIdentity
                : styles.gridResearch;

          return (
            <section
              key={section.id}
              className={styles.section}
              aria-labelledby={`discover-section-${section.id}`}
            >
              <div className={styles.sectionIntro}>
                <h2
                  id={`discover-section-${section.id}`}
                  className={styles.sectionTitle}
                >
                  {section.title}
                </h2>
                <p className={styles.sectionDescription}>
                  {section.description}
                </p>
              </div>
              <div className={`${styles.grid} ${gridClass}`}>
                {collections.map((collection) => (
                  <FeaturedCollectionCard
                    key={collection.address.toLowerCase()}
                    collection={collection}
                    layout={layout}
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
