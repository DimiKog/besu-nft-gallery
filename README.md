# Besu NFT Gallery

Public, read-only NFT viewer for the Besu Edu-Net network. Enter an Ethereum
address to list ERC-721 and ERC-1155 tokens owned by that address, discovered
via Blockscout (no wallet connection, no backend).

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional environment variables (see `.env.example`):

```bash
NEXT_PUBLIC_BLOCKSCOUT_BASE_URL=https://blockexplorer.dimikog.org
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

`NEXT_PUBLIC_IPFS_GATEWAY` is used for `ipfs://` URIs, bare CIDs, and rewriting
`https://ipfs.io/ipfs/...` links. Ordinary non-IPFS `http(s)` image URLs are
left unchanged.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript (`tsc --noEmit`)
- `npm test` — IPFS helper unit tests (Node built-in test runner)

## Manual test address

`0x0E66db7d115B8F392eB7DFb8BaCb23675dAEB59E`
