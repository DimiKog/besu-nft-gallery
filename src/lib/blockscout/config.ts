const DEFAULT_BASE_URL = "https://blockexplorer.dimikog.org";

/** Configurable Blockscout origin (no trailing slash). */
export function getBlockscoutBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BLOCKSCOUT_BASE_URL?.trim();
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}
