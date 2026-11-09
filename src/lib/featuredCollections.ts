import { abbreviateAddress } from "./collectionsDirectory";

/** Curated Discover categories for Besu Edu-Net featured collections. */
export type FeaturedCategory = "education" | "identity" | "research";

/** CSS-oriented visual treatment keys (no image assets). */
export type FeaturedVisualTreatment = "education" | "identity" | "research";

export type FeaturedCollection = {
  address: string;
  category: FeaturedCategory;
  title: string;
  description: string;
  visualTreatment: FeaturedVisualTreatment;
};

export type FeaturedSectionId = FeaturedCategory;

export type FeaturedSection = {
  id: FeaturedSectionId;
  title: string;
  description: string;
  category: FeaturedCategory;
};

/**
 * Static curated registry for the Discover homepage.
 * Descriptions are editorial; live Blockscout metadata is fetched only on Collection Detail.
 */
export const FEATURED_COLLECTIONS: readonly FeaturedCollection[] = [
  {
    address: "0x5Ad2E39FAeE577D233059902eE94bc8df66d69c9",
    category: "education",
    title: "Blockchain & DLT Technologies Starter",
    description:
      "An introductory NFT supporting participation in blockchain and distributed ledger technology learning activities.",
    visualTreatment: "education",
  },
  {
    address: "0xD0151f0535454Ee5Fe0C3B64F98E8Be9Ff50970E",
    category: "education",
    title: "Besu EduNet Course NFT",
    description:
      "Course-related NFTs issued through educational activities on Besu Edu-Net.",
    visualTreatment: "education",
  },
  {
    address: "0xdDE6A59445538eA146a17Dd8745e7eA5288b1a31",
    category: "identity",
    title: "Web3Edu Identity — Wallet",
    description:
      "Wallet-based learner identity represented through a soulbound NFT.",
    visualTreatment: "identity",
  },
  {
    address: "0x5e67E43cd14DaAb71B01A5268d209CB3b69dC175",
    category: "identity",
    title: "Web3Edu Identity — Account Abstraction",
    description:
      "Account-abstraction-based learner identity supporting an alternative Web3Edu onboarding model.",
    visualTreatment: "identity",
  },
  {
    address: "0x0300C86Fcdb068e91855166142e6f4138e7BFDCC",
    category: "identity",
    title: "Blockchain & Web3 Certificate",
    description:
      "An NFT-based certificate associated with blockchain and Web3 educational activities.",
    visualTreatment: "identity",
  },
  {
    address: "0x095dbc84D218695B09Ab6Ac662C11C8312621ed5",
    category: "identity",
    title: "Proof of Escape Reward",
    description:
      "An achievement NFT awarded through an interactive blockchain learning experience.",
    visualTreatment: "identity",
  },
  {
    address: "0x5B07CFc1f196ACE3cc947f89B8d83c9E776eE186",
    category: "research",
    title: "CoNSeRT Digital Twin",
    description:
      "A blockchain-backed digital twin developed for Researchers’ Night 2026.",
    visualTreatment: "research",
  },
] as const;

export const FEATURED_SECTIONS: readonly FeaturedSection[] = [
  {
    id: "education",
    title: "Educational Collections",
    description:
      "Course and starter NFTs that support learning activities on Besu Edu-Net.",
    category: "education",
  },
  {
    id: "identity",
    title: "Identity & Achievements",
    description:
      "Learner identities, certificates, and achievement NFTs that recognize participation and progress.",
    category: "identity",
  },
  {
    id: "research",
    title: "Research Applications",
    description:
      "Research-oriented NFT applications exploring blockchain-backed experimentation on Edu-Net.",
    category: "research",
  },
] as const;

export function getFeaturedCollectionsByCategory(
  category: FeaturedCategory,
): FeaturedCollection[] {
  return FEATURED_COLLECTIONS.filter((entry) => entry.category === category);
}

/** Accessible label for a featured Discover card action. */
export function featuredCardAccessibleName(
  title: string,
  address: string,
): string {
  return `Explore collection ${title.trim()}, contract ${abbreviateAddress(address)}`;
}

export function categoryLabel(category: FeaturedCategory): string {
  switch (category) {
    case "education":
      return "Education";
    case "identity":
      return "Identity & Achievements";
    case "research":
      return "Research";
  }
}
