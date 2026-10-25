# Besu NFT Gallery

Public URL: [https://nft.dimikog.org](https://nft.dimikog.org)

Public, read-only NFT viewer for the **Besu Edu-Net** network. Enter an Ethereum
wallet address to list ERC-721 and ERC-1155 tokens owned by that address.

## Architecture

Browser/static frontend → existing Blockscout REST API → Besu Edu-Net.

- No wallet connection
- No minting or transfers
- No Gallery backend or database
- NFT discovery is performed through Blockscout

The Gallery is a static Next.js export. All Blockscout and IPFS requests run in
the browser.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
```

`next.config.ts` sets `output: "export"`. The build writes a static site to
`out/` (HTML, CSS, JS, and assets). Serve that directory with any static host;
a Node.js Next.js server is not required.

## Deployment

GitHub Actions builds the static export and deploys `out/` to GitHub Pages
(see `.github/workflows/nextjs.yml`).

## Environment variables

Optional values (see `.env.example`). Defaults are used when unset.

```bash
NEXT_PUBLIC_BLOCKSCOUT_BASE_URL=https://blockexplorer.dimikog.org
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

`NEXT_PUBLIC_*` variables are embedded into the client bundle at **build time**.
Change them before `npm run build` (or in CI) for a different Blockscout origin
or IPFS gateway.

`NEXT_PUBLIC_IPFS_GATEWAY` is used for `ipfs://` URIs, bare CIDs, and rewriting
`https://ipfs.io/ipfs/...` links. Ordinary non-IPFS `http(s)` image URLs are
left unchanged.

## Quality commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
