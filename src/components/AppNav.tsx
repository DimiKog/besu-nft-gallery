"use client";

import type { GalleryNavDestination } from "@/lib/galleryQuery";
import styles from "./AppNav.module.css";

type AppNavProps = {
  active: GalleryNavDestination;
  onNavigate: (destination: GalleryNavDestination) => void;
};

export function AppNav({ active, onNavigate }: AppNavProps) {
  return (
    <header className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true" />
        <div className={styles.brandText}>
          <p className={styles.brandTitle}>Besu NFT Gallery</p>
          <p className={styles.brandSubtitle}>Besu Edu-Net</p>
        </div>
      </div>

      <nav aria-label="Primary">
        <ul className={styles.list}>
          <li>
            <button
              type="button"
              className={
                active === "discover"
                  ? `${styles.item} ${styles.active}`
                  : styles.item
              }
              aria-current={active === "discover" ? "page" : undefined}
              onClick={() => onNavigate("discover")}
            >
              Discover
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
                active === "wallet"
                  ? `${styles.item} ${styles.active}`
                  : styles.item
              }
              aria-current={active === "wallet" ? "page" : undefined}
              onClick={() => onNavigate("wallet")}
            >
              Wallet Gallery
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
