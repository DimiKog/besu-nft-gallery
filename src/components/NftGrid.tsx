"use client";

import type { NftItem } from "@/lib/nft";
import { NftCard } from "./NftCard";
import styles from "./NftGrid.module.css";

type NftGridProps = {
  items: NftItem[];
  onSelect: (nft: NftItem, trigger: HTMLButtonElement) => void;
};

export function NftGrid({ items, onSelect }: NftGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((nft) => (
        <NftCard key={nft.id} nft={nft} onSelect={onSelect} />
      ))}
    </div>
  );
}
