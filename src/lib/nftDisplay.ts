import { getBlockscoutBaseUrl } from "@/lib/blockscout/config";
import type { NftItem } from "@/lib/nft";

export function getNftDisplayName(nft: Pick<NftItem, "name" | "tokenId">): string {
  if (nft.name != null && nft.name.trim().length > 0) {
    return nft.name;
  }
  return `Token #${nft.tokenId}`;
}

/**
 * Show balance on compact UI only for ERC-1155 or when value is not "1".
 */
export function shouldShowBalance(
  nft: Pick<NftItem, "tokenType" | "balance">,
): boolean {
  if (nft.balance == null || nft.balance.trim() === "") {
    return false;
  }
  if (nft.tokenType === "ERC-1155") {
    return true;
  }
  return nft.balance.trim() !== "1";
}

export function buildBlockscoutTokenInstanceUrl(
  contractAddress: string,
  tokenId: string,
  baseUrl: string = getBlockscoutBaseUrl(),
): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/token/${encodeURIComponent(contractAddress)}/instance/${encodeURIComponent(tokenId)}`;
}
