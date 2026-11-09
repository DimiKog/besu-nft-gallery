/** Subset of Blockscout API v2 NFT item fields used by this app. */
export type BlockscoutTokenInfo = {
  address?: string | null;
  address_hash?: string | null;
  name?: string | null;
  symbol?: string | null;
  type?: string | null;
  holders?: string | number | null;
  holders_count?: string | number | null;
  total_supply?: string | number | null;
  icon_url?: string | null;
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

/** Owner object as returned on token instance endpoints (shape varies). */
export type BlockscoutNftOwner = {
  hash?: string | null;
  address?: string | null;
  address_hash?: string | null;
};

export type BlockscoutNftItem = {
  id?: string | number | null;
  token_type?: string | null;
  image_url?: string | null;
  media_url?: string | null;
  animation_url?: string | null;
  value?: string | null;
  external_app_url?: string | null;
  metadata?: BlockscoutNftMetadata | null;
  token?: BlockscoutTokenInfo | null;
  owner?: BlockscoutNftOwner | string | null;
};

export type BlockscoutNftPage = {
  items?: BlockscoutNftItem[] | null;
  next_page_params?: Record<string, string | number | null> | null;
};

/** Token / collection list or detail payload from `/api/v2/tokens`. */
export type BlockscoutTokenCollection = {
  address?: string | null;
  address_hash?: string | null;
  name?: string | null;
  symbol?: string | null;
  type?: string | null;
  holders?: string | number | null;
  holders_count?: string | number | null;
  total_supply?: string | number | null;
  icon_url?: string | null;
};

export type BlockscoutTokenCollectionPage = {
  items?: BlockscoutTokenCollection[] | null;
  next_page_params?: Record<string, string | number | null> | null;
};
