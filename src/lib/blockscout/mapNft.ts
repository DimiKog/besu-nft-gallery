import { decodeBasicHtmlEntities } from "@/lib/htmlEntities";
import { resolveIpfsImageUrls } from "@/lib/ipfs";
import type { NftAttribute, NftItem, NftTokenType } from "@/lib/nft";
import { toSafeHttpUrl } from "@/lib/safeUrl";
import type {
  BlockscoutNftAttribute,
  BlockscoutNftItem,
} from "./types";

export type MapBlockscoutNftOptions = {
  /** Used when the instance payload omits nested `token` address fields. */
  fallbackContractAddress?: string | null;
  /** Used when the instance payload omits token type. */
  fallbackTokenType?: string | null;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
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

/** Extract owner address from Blockscout owner object or string. */
export function mapOwnerAddress(owner: unknown): string | null {
  if (typeof owner === "string") {
    return asNonEmptyString(owner);
  }
  if (!owner || typeof owner !== "object" || Array.isArray(owner)) {
    return null;
  }

  const record = owner as Record<string, unknown>;
  return (
    asNonEmptyString(record.hash) ??
    asNonEmptyString(record.address_hash) ??
    asNonEmptyString(record.address)
  );
}

/**
 * Token IDs must remain strings — never coerce through Number
 * (avoids precision loss for large IDs).
 */
export function mapTokenId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Only safe integers are lossless via Number; still stringify trunc.
    return String(Math.trunc(value));
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return null;
}

export function mapBlockscoutNftItem(
  item: BlockscoutNftItem,
  options: MapBlockscoutNftOptions = {},
): NftItem | null {
  const tokenId = mapTokenId(item.id);
  const contractAddress =
    asNonEmptyString(item.token?.address_hash) ??
    asNonEmptyString(item.token?.address) ??
    asNonEmptyString(options.fallbackContractAddress);

  if (!tokenId || !contractAddress) {
    return null;
  }

  const { imageUrl, imageFallbackUrl } = pickImageUrls(item);
  const metadata = item.metadata;
  const tokenTypeSource =
    item.token_type ??
    item.token?.type ??
    options.fallbackTokenType ??
    undefined;

  return {
    id: `${contractAddress}-${tokenId}`,
    tokenId,
    contractAddress,
    tokenType: mapTokenType(tokenTypeSource),
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
    ownerAddress: mapOwnerAddress(item.owner),
  };
}

export function mapBlockscoutNftItems(
  items: BlockscoutNftItem[],
  options: MapBlockscoutNftOptions = {},
): NftItem[] {
  const mapped: NftItem[] = [];

  for (const item of items) {
    const nft = mapBlockscoutNftItem(item, options);
    if (nft) {
      mapped.push(nft);
    }
  }

  return mapped;
}
