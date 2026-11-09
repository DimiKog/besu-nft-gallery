"use client";

import {
  featuredCardAccessibleName,
  type FeaturedCollection,
} from "@/lib/featuredCollections";
import { FeaturedCollectionVisual } from "./FeaturedCollectionVisual";
import styles from "./FeaturedCollectionCard.module.css";

type FeaturedCollectionCardProps = {
  collection: FeaturedCollection;
  layout?: "horizontal" | "vertical";
  onExplore: (contractAddress: string) => void;
};

function badgeLabel(category: FeaturedCollection["category"]): string {
  switch (category) {
    case "education":
      return "Education";
    case "identity":
      return "Identity";
    case "research":
      return "Research";
  }
}

export function FeaturedCollectionCard({
  collection,
  layout = "vertical",
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
  const layoutClass =
    layout === "horizontal" ? styles.layoutHorizontal : styles.layoutVertical;

  return (
    <article className={`${styles.card} ${layoutClass} ${treatmentClass}`}>
      <div className={styles.visual}>
        <FeaturedCollectionVisual collection={collection} />
      </div>
      <div className={styles.body}>
        <p className={styles.category}>{badgeLabel(collection.category)}</p>
        <h3 className={styles.title}>{collection.title}</h3>
        <p className={styles.description}>{collection.description}</p>
        <button
          type="button"
          className={styles.action}
          onClick={() => onExplore(collection.address)}
          aria-label={accessibleName}
        >
          Explore
        </button>
      </div>
    </article>
  );
}
