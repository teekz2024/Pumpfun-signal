import { Connection, PublicKey } from '@solana/web3.js';
import { PUMPFUN_PROGRAM_ID } from '../utils/constants';
import { TokenLaunch } from '../types';

type LaunchHandler = (launch: TokenLaunch) => void;

/**
 * Subscribes to pump.fun program logs on Solana and emits a TokenLaunch
 * event the moment a new "create" instruction is observed on-chain.
 *
 * This is intentionally on-chain-first rather than scraping pump.fun's
 * frontend API: it's faster (no polling delay), doesn't break when they
 * change their site, and can't be rate-limited by their backend.
 */
export class PumpFunListener {
  private connection: Connection;
  private subscriptionId: number | null = null;
  private programId: PublicKey;
  private onLaunch: LaunchHandler;
  private seen = new Set<string>(); // dedupe by signature

  constructor(rpcWssUrl: string, onLaunch: LaunchHandler) {
    this.connection = new Connection(rpcWssUrl.replace('wss', 'https'), {
      wsEndpoint: rpcWssUrl,
      commitment: 'confirmed',
    });
    this.programId = new PublicKey(PUMPFUN_PROGRAM_ID);
    this.onLaunch = onLaunch;
  }

  start() {
    if (this.subscriptionId !== null) return;

    this.subscriptionId = this.connection.onLogs(
      this.programId,
      async (logInfo) => {
        try {
          const { signature, logs, err } = logInfo;
          if (err) return; // skip failed txs
          if (this.seen.has(signature)) return;

          // pump.fun's create instruction emits a log line containing "Instruction: Create"
          const isCreate = logs.some((l) => l.includes('Instruction: Create'));
          if (!isCreate) return;

          this.seen.add(signature);
          if (this.seen.size > 5000) {
            // keep the dedupe set bounded
            const first = this.seen.values().next().value;
            this.seen.delete(first);
          }

          const launch = await this.parseCreateTransaction(signature);
          if (launch) this.onLaunch(launch);
        } catch (e) {
          console.warn('Error processing log:', e);
        }
      },
      'confirmed',
    );
  }

  stop() {
    if (this.subscriptionId !== null) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
  }

  /**
   * Fetches the full transaction for a detected "Create" signature and
   * extracts mint, creator, and metadata URI. pump.fun's create instruction
   * includes name/symbol/uri as instruction args plus the new mint and
   * the creator (fee payer) accounts.
   */
  private async parseCreateTransaction(signature: string): Promise<TokenLaunch | null> {
    const tx = await this.connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    if (!tx || !tx.meta) return null;

    // The pump.fun create instruction is the first instruction targeting
    // the program; account order is fixed by their IDL: [mint, mintAuthority,
    // bondingCurve, ... , creator/payer, ...]. Account 0 = new mint, and the
    // fee payer (accountKeys[0] of the tx) is the creator wallet.
    const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
    const creator = accountKeys[0];

    const programIx = tx.transaction.message.instructions.find(
      (ix: any) => ix.programId?.toBase58?.() === PUMPFUN_PROGRAM_ID,
    ) as any;
    if (!programIx) return null;

    const mint = programIx.accounts?.[0]?.toBase58?.() ?? programIx.accounts?.[0];

    // Instruction args (name, symbol, uri) are only available if the RPC
    // decodes them via an IDL-aware parser; if not, fall back to on-chain
    // metadata lookup (Metaplex) as a second step in the risk scorer.
    const parsedData = (programIx as any).parsed?.info ?? {};

    return {
      mint: mint ?? 'unknown',
      name: parsedData.name ?? 'Unknown',
      symbol: parsedData.symbol ?? '???',
      creator,
      createdAt: (tx.blockTime ?? Date.now() / 1000) * 1000,
      signature,
      uri: parsedData.uri,
    };
  }
}
