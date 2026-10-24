/** Default public gateway for V1 (Pinata). Override with NEXT_PUBLIC_IPFS_GATEWAY. */
export const DEFAULT_IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export type ResolvedIpfsImage = {
  imageUrl: string | null;
  /** CID-only gateway URL when the primary ref is CID/path; otherwise null. */
  imageFallbackUrl: string | null;
};

/**
 * Ensure a gateway base URL ends with exactly one trailing slash.
 * Empty/whitespace input falls back to the default gateway.
 */
export function normalizeIpfsGateway(gateway: string): string {
  const trimmed = gateway.trim();
  if (!trimmed) {
    return normalizeIpfsGateway(DEFAULT_IPFS_GATEWAY);
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

/** Resolved gateway from env, or the V1 Pinata default. */
export function getIpfsGateway(): string {
  const fromEnv = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  if (fromEnv != null && fromEnv.trim().length > 0) {
    return normalizeIpfsGateway(fromEnv);
  }
  return normalizeIpfsGateway(DEFAULT_IPFS_GATEWAY);
}

/** Static default gateway constant (same as DEFAULT_IPFS_GATEWAY). */
export const IPFS_GATEWAY = DEFAULT_IPFS_GATEWAY;

/**
 * If the URL is an ipfs.io gateway link, return the CID/path portion.
 * Other http(s) URLs return null (leave unchanged by resolveToHttpUrl).
 */
function extractIpfsIoPath(url: string): string | null {
  const match = /^https?:\/\/ipfs\.io\/ipfs\/(.+)$/i.exec(url);
  const path = match?.[1]?.trim();
  return path && path.length > 0 ? path : null;
}

function isLikelyIpfsCid(cid: string): boolean {
  // CIDv0 (base58btc)
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) {
    return true;
  }

  // Common CIDv1 base32 prefixes (bafy…, bafk…, bafkre…, etc.)
  if (/^baf[a-z0-9]{10,}$/i.test(cid)) {
    return true;
  }

  return false;
}

function isLikelyIpfsCidPath(value: string): boolean {
  const cid = value.split("/")[0] ?? "";
  return isLikelyIpfsCid(cid);
}

/**
 * Extract CID[/path] from a recognized IPFS reference.
 * Returns null for ordinary non-IPFS http(s) URLs and unrecognized values.
 */
export function extractIpfsContentPath(
  ref: string,
  gateway: string = getIpfsGateway(),
): string | null {
  const value = ref.trim();
  if (!value) {
    return null;
  }

  const gatewayBase = normalizeIpfsGateway(gateway);

  if (/^https?:\/\//i.test(value)) {
    const ipfsIoPath = extractIpfsIoPath(value);
    if (ipfsIoPath) {
      return ipfsIoPath;
    }

    if (value.toLowerCase().startsWith(gatewayBase.toLowerCase())) {
      const rest = value.slice(gatewayBase.length).trim();
      return rest.length > 0 ? rest : null;
    }

    return null;
  }

  if (value.startsWith("ipfs://")) {
    let path = value.slice("ipfs://".length);
    if (path.startsWith("ipfs/")) {
      path = path.slice("ipfs/".length);
    }
    return path.length > 0 ? path : null;
  }

  if (value.startsWith("/ipfs/")) {
    const path = value.slice("/ipfs/".length);
    return path.length > 0 ? path : null;
  }

  if (isLikelyIpfsCidPath(value)) {
    return value;
  }

  return null;
}

/**
 * Normalize mixed image references into an HTTP(S) URL.
 * Returns null for missing/malformed values — never throws.
 */
export function resolveToHttpUrl(
  ref: string | null | undefined,
  gateway: string = getIpfsGateway(),
): string | null {
  try {
    if (ref == null) {
      return null;
    }

    const value = ref.trim();
    if (!value) {
      return null;
    }

    const gatewayBase = normalizeIpfsGateway(gateway);

    if (/^https?:\/\//i.test(value)) {
      const ipfsIoPath = extractIpfsIoPath(value);
      if (ipfsIoPath) {
        return `${gatewayBase}${ipfsIoPath}`;
      }
      return value;
    }

    if (value.startsWith("ipfs://")) {
      let path = value.slice("ipfs://".length);
      if (path.startsWith("ipfs/")) {
        path = path.slice("ipfs/".length);
      }
      if (!path) {
        return null;
      }
      return `${gatewayBase}${path}`;
    }

    if (value.startsWith("/ipfs/")) {
      const path = value.slice("/ipfs/".length);
      if (!path) {
        return null;
      }
      return `${gatewayBase}${path}`;
    }

    if (isLikelyIpfsCidPath(value)) {
      return `${gatewayBase}${value}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve primary image URL plus an optional one-shot CID-only fallback when
 * the reference is a recognized IPFS CID/path resource.
 */
export function resolveIpfsImageUrls(
  ref: string | null | undefined,
  gateway: string = getIpfsGateway(),
): ResolvedIpfsImage {
  try {
    if (ref == null) {
      return { imageUrl: null, imageFallbackUrl: null };
    }

    const value = ref.trim();
    if (!value) {
      return { imageUrl: null, imageFallbackUrl: null };
    }

    const imageUrl = resolveToHttpUrl(value, gateway);
    if (!imageUrl) {
      return { imageUrl: null, imageFallbackUrl: null };
    }

    const contentPath = extractIpfsContentPath(value, gateway);
    if (!contentPath) {
      return { imageUrl, imageFallbackUrl: null };
    }

    const slashIndex = contentPath.indexOf("/");
    if (slashIndex <= 0) {
      return { imageUrl, imageFallbackUrl: null };
    }

    const cid = contentPath.slice(0, slashIndex);
    const remainder = contentPath.slice(slashIndex + 1).trim();
    if (!isLikelyIpfsCid(cid) || !remainder) {
      return { imageUrl, imageFallbackUrl: null };
    }

    const gatewayBase = normalizeIpfsGateway(gateway);
    const imageFallbackUrl = `${gatewayBase}${cid}`;
    if (imageFallbackUrl === imageUrl) {
      return { imageUrl, imageFallbackUrl: null };
    }

    return { imageUrl, imageFallbackUrl };
  } catch {
    return { imageUrl: null, imageFallbackUrl: null };
  }
}
