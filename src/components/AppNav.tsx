"use client";

import type { GalleryNavDestination } from "@/lib/galleryQuery";
import styles from "./AppNav.module.css";

type AppNavProps = {
  active: GalleryNavDestination;
  onNavigate: (destination: GalleryNavDestination) => void;
};

export function AppNav({ active, onNavigate }: AppNavProps) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={styles.item}
            disabled
            aria-disabled="true"
            title="Discover is coming soon"
          >
            Discover
            <span className={styles.badge}>Coming soon</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={
              active === "collections"
                ? `${styles.item} ${styles.active}`
                : styles.item
            }
            aria-current={active === "collections" ? "page" : undefined}
            onClick={() => onNavigate("collections")}
          >
            Collections
          </button>
        </li>
        <li>
          <button
            type="button"
            className={
              active === "wallet" ? `${styles.item} ${styles.active}` : styles.item
            }
            aria-current={active === "wallet" ? "page" : undefined}
            onClick={() => onNavigate("wallet")}
          >
            Wallet Gallery
          </button>
        </li>
      </ul>
    </nav>
  );
}
