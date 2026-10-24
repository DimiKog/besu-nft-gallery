/** Subset of Blockscout API v2 NFT item fields used by this app. */
export type BlockscoutTokenInfo = {
  address?: string | null;
  address_hash?: string | null;
  name?: string | null;
  symbol?: string | null;
  type?: string | null;
};

export type BlockscoutNftAttribute = {
  trait_type?: unknown;
  traitType?: unknown;
  value?: unknown;
};

export type BlockscoutNftMetadata = {
  name?: string | null;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
  external_url?: string | null;
  attributes?: BlockscoutNftAttribute[] | null;
};

export type BlockscoutNftItem = {
  id?: string | null;
  token_type?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  animation_url?: string | null;
  value?: string | null;
  external_app_url?: string | null;
  metadata?: BlockscoutNftMetadata | null;
  token?: BlockscoutTokenInfo | null;
};

export type BlockscoutNftPage = {
  items?: BlockscoutNftItem[] | null;
  next_page_params?: Record<string, string | number | null> | null;
};
