import type { CollectionSummary } from "@/lib/collection";
import { decodeBasicHtmlEntities } from "@/lib/htmlEntities";
import { resolveIpfsImageUrls } from "@/lib/ipfs";
import type { NftTokenType } from "@/lib/nft";
import { isValidEthereumAddress } from "@/lib/address";
import type { BlockscoutTokenCollection } from "./types";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

/**
 * Parse a non-negative integer count from Blockscout.
 * Missing / blank / non-numeric → null (unknown). `"0"` / `0` → 0.
 */
export function parseHoldersCount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) {
      return null;
    }
    return parsed;
  }

  return null;
}

/**
 * Preserve supply as a string. Absent/blank → null (unknown).
 * Explicit `"0"` / `0` remain zero and are not collapsed to null.
 */
export function parseTotalSupply(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return String(Math.trunc(value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function pickContractAddress(
  item: BlockscoutTokenCollection,
): string | null {
  const address =
    asNonEmptyString(item.address_hash) ?? asNonEmptyString(item.address);
  if (!address || !isValidEthereumAddress(address)) {
    return null;
  }
  return address;
}

function pickIconUrl(value: unknown): string | null {
  const raw = asNonEmptyString(value);
  if (!raw) {
    return null;
  }
  const resolved = resolveIpfsImageUrls(raw);
  return resolved.imageUrl;
}

export function mapBlockscoutCollection(
  item: BlockscoutTokenCollection,
): CollectionSummary | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const address = pickContractAddress(item);
  if (!address) {
    return null;
  }

  return {
    address,
    name: asDecodedText(item.name),
    symbol: asDecodedText(item.symbol),
    tokenType: mapTokenType(asNonEmptyString(item.type) ?? undefined),
    holdersCount: parseHoldersCount(
      item.holders_count ?? item.holders,
    ),
    totalSupply: parseTotalSupply(item.total_supply),
    iconUrl: pickIconUrl(item.icon_url),
  };
}

export function mapBlockscoutCollections(
  items: BlockscoutTokenCollection[],
): CollectionSummary[] {
  const mapped: CollectionSummary[] = [];

  for (const item of items) {
    const collection = mapBlockscoutCollection(item);
    if (collection) {
      mapped.push(collection);
    }
  }

  return mapped;
}
