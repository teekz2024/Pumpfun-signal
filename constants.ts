// pump.fun's on-chain program on Solana mainnet.
// Every new token launch on pump.fun calls this program's "create" instruction,
// so listening to its logs catches launches the instant they happen on-chain —
// no dependence on pump.fun's unofficial REST API.
export const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Use your own RPC. Public endpoints rate-limit hard and will drop your
// websocket under real launch volume (dozens of new tokens/minute at peak).
// Recommended: Helius, QuickNode, or Triton — set via env or a settings screen.
export const DEFAULT_RPC_HTTP = 'https://api.mainnet-beta.solana.com';
export const DEFAULT_RPC_WSS = 'wss://api.mainnet-beta.solana.com';

// Risk score thresholds
export const RISK_LOW_MAX = 33;
export const RISK_MEDIUM_MAX = 66;
// >66 = HIGH risk

// How many recent trending token names/symbols to keep for copycat detection
export const TRENDING_CACHE_SIZE = 200;

export const STORAGE_KEYS = {
  RPC_ENDPOINT: 'settings:rpc_wss',
  FEED: 'feed:tokens',
  SETTINGS: 'settings:general',
};
