export type NftTokenType = "ERC-721" | "ERC-1155" | "other";

export type NftItem = {
  id: string;
  tokenId: string;
  contractAddress: string;
  tokenType: NftTokenType;
  collectionName: string | null;
  collectionSymbol: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Optional CID-only IPFS URL when imageUrl is CID/path; null otherwise. */
  imageFallbackUrl: string | null;
  rawImageRef: string | null;
  balance: string | null;
};
