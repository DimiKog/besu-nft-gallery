/**
 * Local Discover illustration assets (static-export friendly).
 * Production publishes optimized WebP only under public/.
 * Original PNGs are preserved as source assets outside public/.
 */
export type DiscoverImageAsset = {
  src: string;
  /** Intrinsic aspect ratio reference (original PNG). */
  width: number;
  height: number;
};

export const DISCOVER_HERO_IMAGE: DiscoverImageAsset = {
  src: "/images/discover/optimized/hero-blockchain.webp",
  width: 1536,
  height: 1024,
};

const FEATURED_IMAGES_BY_ADDRESS: Record<string, DiscoverImageAsset> = {
  "0x5ad2e39faee577d233059902ee94bc8df66d69c9": {
    src: "/images/discover/optimized/education-starter.webp",
    width: 1536,
    height: 1024,
  },
  "0xd0151f0535454ee5fe0c3b64f98e8be9ff50970e": {
    src: "/images/discover/optimized/education-course.webp",
    width: 1536,
    height: 1024,
  },
  "0xdde6a59445538ea146a17dd8745e7ea5288b1a31": {
    src: "/images/discover/optimized/identity-wallet.webp",
    width: 1536,
    height: 1024,
  },
  "0x5e67e43cd14daab71b01a5268d209cb3b69dc175": {
    src: "/images/discover/optimized/identity-aa.webp",
    width: 1536,
    height: 1024,
  },
  "0x0300c86fcdb068e91855166142e6f4138e7bfdcc": {
    src: "/images/discover/optimized/certificate.webp",
    width: 1536,
    height: 1024,
  },
  "0x095dbc84d218695b09ab6ac662c11c8312621ed5": {
    src: "/images/discover/optimized/poe-reward.webp",
    width: 1536,
    height: 1024,
  },
  "0x5b07cfc1f196ace3cc947f89b8d83c9e776ee186": {
    src: "/images/discover/optimized/research-twin.webp",
    width: 1536,
    height: 1024,
  },
};

export function getFeaturedCollectionImage(
  address: string,
): DiscoverImageAsset | null {
  return FEATURED_IMAGES_BY_ADDRESS[address.trim().toLowerCase()] ?? null;
}
