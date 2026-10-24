export type NftTokenType = "ERC-721" | "ERC-1155" | "other";

/** Generic metadata attribute; values are stringified for safe UI rendering. */
export type NftAttribute = {
  traitType: string;
  value: string;
};

export type NftItem = {
  id: string;
  tokenId: string;
  contractAddress: string;
  tokenType: NftTokenType;
  collectionName: string | null;
  collectionSymbol: string | null;
  name: string | null;
  description: string | null;
  attributes: NftAttribute[];
  /** Prefer metadata.external_url; fall back to item.external_app_url. */
  externalUrl: string | null;
  imageUrl: string | null;
  /** Optional CID-only IPFS URL when imageUrl is CID/path; null otherwise. */
  imageFallbackUrl: string | null;
  rawImageRef: string | null;
  balance: string | null;
};
