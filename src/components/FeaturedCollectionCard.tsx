"use client";

import {
  categoryLabel,
  featuredCardAccessibleName,
  type FeaturedCollection,
} from "@/lib/featuredCollections";
import styles from "./FeaturedCollectionCard.module.css";

type FeaturedCollectionCardProps = {
  collection: FeaturedCollection;
  onExplore: (contractAddress: string) => void;
};

export function FeaturedCollectionCard({
  collection,
  onExplore,
}: FeaturedCollectionCardProps) {
  const accessibleName = featuredCardAccessibleName(
    collection.title,
    collection.address,
  );
  const treatmentClass =
    collection.visualTreatment === "education"
      ? styles.treatmentEducation
      : collection.visualTreatment === "identity"
        ? styles.treatmentIdentity
        : styles.treatmentResearch;

  return (
    <article className={`${styles.card} ${treatmentClass}`}>
      <div className={styles.visual} aria-hidden="true">
        <span className={styles.visualMark} />
      </div>
      <div className={styles.body}>
        <p className={styles.category}>{categoryLabel(collection.category)}</p>
        <h4 className={styles.title}>{collection.title}</h4>
        <p className={styles.description}>{collection.description}</p>
        <button
          type="button"
          className={styles.action}
          onClick={() => onExplore(collection.address)}
          aria-label={accessibleName}
        >
          Explore Collection
        </button>
      </div>
    </article>
  );
}
