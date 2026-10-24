import { resolveIpfsImageUrls } from "@/lib/ipfs";
import type { NftItem, NftTokenType } from "@/lib/nft";
import type { BlockscoutNftItem } from "./types";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapTokenType(value: string | null | undefined): NftTokenType {
  if (value === "ERC-721" || value === "ERC-1155") {
    return value;
  }
  return "other";
}

function pickRawImageRef(item: BlockscoutNftItem): string | null {
  const candidates = [
    item.image_url,
    item.media_url,
    item.metadata?.image,
    item.metadata?.image_url,
  ];

  for (const candidate of candidates) {
    const raw = asNonEmptyString(candidate);
    if (raw) {
      return raw;
    }
  }

  return null;
}

function pickImageUrls(item: BlockscoutNftItem): {
  imageUrl: string | null;
  imageFallbackUrl: string | null;
} {
  const candidates = [
    item.image_url,
    item.media_url,
    item.metadata?.image,
    item.metadata?.image_url,
  ];

  for (const candidate of candidates) {
    const resolved = resolveIpfsImageUrls(candidate);
    if (resolved.imageUrl) {
      return resolved;
    }
  }

  return { imageUrl: null, imageFallbackUrl: null };
}

export function mapBlockscoutNftItem(item: BlockscoutNftItem): NftItem | null {
  const tokenId = asNonEmptyString(item.id);
  const contractAddress =
    asNonEmptyString(item.token?.address_hash) ??
    asNonEmptyString(item.token?.address);

  if (!tokenId || !contractAddress) {
    return null;
  }

  const { imageUrl, imageFallbackUrl } = pickImageUrls(item);

  return {
    id: `${contractAddress}-${tokenId}`,
    tokenId,
    contractAddress,
    tokenType: mapTokenType(item.token_type ?? item.token?.type),
    collectionName: asNonEmptyString(item.token?.name),
    collectionSymbol: asNonEmptyString(item.token?.symbol),
    name: asNonEmptyString(item.metadata?.name),
    description: asNonEmptyString(item.metadata?.description),
    imageUrl,
    imageFallbackUrl,
    rawImageRef: pickRawImageRef(item),
    balance: asNonEmptyString(item.value),
  };
}

export function mapBlockscoutNftItems(items: BlockscoutNftItem[]): NftItem[] {
  const mapped: NftItem[] = [];

  for (const item of items) {
    const nft = mapBlockscoutNftItem(item);
    if (nft) {
      mapped.push(nft);
    }
  }

  return mapped;
}
