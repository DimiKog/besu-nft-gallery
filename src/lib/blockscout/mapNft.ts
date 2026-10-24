import { decodeBasicHtmlEntities } from "@/lib/htmlEntities";
import { resolveIpfsImageUrls } from "@/lib/ipfs";
import type { NftAttribute, NftItem, NftTokenType } from "@/lib/nft";
import { toSafeHttpUrl } from "@/lib/safeUrl";
import type {
  BlockscoutNftAttribute,
  BlockscoutNftItem,
} from "./types";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Non-empty trimmed text with basic HTML entities decoded for display. */
function asDecodedText(value: unknown): string | null {
  const text = asNonEmptyString(value);
  if (text == null) {
    return null;
  }
  return decodeBasicHtmlEntities(text);
}

function mapTokenType(value: string | null | undefined): NftTokenType {
  if (value === "ERC-721" || value === "ERC-1155") {
    return value;
  }
  return "other";
}

function stringifyAttributeValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isEmptyAttributeValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string" && value.trim() === "") {
    return true;
  }
  return false;
}

export function mapAttributes(
  raw: BlockscoutNftAttribute[] | null | undefined,
): NftAttribute[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const attributes: NftAttribute[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const traitRaw = entry.trait_type ?? entry.traitType;
    if (traitRaw === null || traitRaw === undefined) {
      continue;
    }

    const traitType = String(traitRaw).trim();
    if (!traitType) {
      continue;
    }

    if (isEmptyAttributeValue(entry.value)) {
      continue;
    }

    attributes.push({
      traitType: decodeBasicHtmlEntities(traitType),
      value: decodeBasicHtmlEntities(stringifyAttributeValue(entry.value)),
    });
  }

  return attributes;
}

function pickExternalUrl(item: BlockscoutNftItem): string | null {
  const fromMetadata = toSafeHttpUrl(item.metadata?.external_url);
  if (fromMetadata) {
    return fromMetadata;
  }
  return toSafeHttpUrl(item.external_app_url);
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
  const metadata = item.metadata;

  return {
    id: `${contractAddress}-${tokenId}`,
    tokenId,
    contractAddress,
    tokenType: mapTokenType(item.token_type ?? item.token?.type),
    collectionName: asDecodedText(item.token?.name),
    collectionSymbol: asDecodedText(item.token?.symbol),
    name: asDecodedText(metadata?.name),
    description: asDecodedText(metadata?.description),
    attributes: mapAttributes(metadata?.attributes),
    externalUrl: pickExternalUrl(item),
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
