import { Connection, PublicKey } from '@solana/web3.js';
import { RiskAssessment, RiskFactor, RiskLevel, TokenLaunch } from '../types';
import { RISK_LOW_MAX, RISK_MEDIUM_MAX } from '../utils/constants';

/**
 * Heuristic, explainable risk scoring. This is NOT a guarantee of safety —
 * it surfaces on-chain red flags common to rugs/honeypots so a human can
 * make a faster, better-informed decision. Always treat this as one input,
 * not a verdict.
 */
export class RiskScorer {
  constructor(private connection: Connection) {}

  async assess(launch: TokenLaunch, recentNames: string[]): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];

    const [devSupplyPct, topHolderPct, creatorAgeDays, creatorPastLaunches] = await Promise.all([
      this.getDevSupplyPct(launch),
      this.getTopHolderPct(launch),
      this.getCreatorWalletAgeDays(launch.creator),
      this.getCreatorPastLaunches(launch.creator),
    ]);

    // --- Dev/creator supply concentration ---
    if (devSupplyPct !== null) {
      if (devSupplyPct > 20) {
        factors.push({ label: 'High dev allocation', points: 25, detail: `Creator holds ~${devSupplyPct.toFixed(1)}% of supply` });
      } else if (devSupplyPct > 8) {
        factors.push({ label: 'Elevated dev allocation', points: 12, detail: `Creator holds ~${devSupplyPct.toFixed(1)}% of supply` });
      }
    }

    // --- Holder concentration beyond creator ---
    if (topHolderPct !== null && topHolderPct > 15) {
      factors.push({ label: 'Concentrated holdings', points: 15, detail: `Top holder owns ~${topHolderPct.toFixed(1)}% of supply` });
    }

    // --- Creator wallet age (fresh wallets are a common rug pattern) ---
    if (creatorAgeDays !== null) {
      if (creatorAgeDays < 1) {
        factors.push({ label: 'Brand-new creator wallet', points: 20, detail: 'Wallet was funded less than 24h ago' });
      } else if (creatorAgeDays < 7) {
        factors.push({ label: 'Young creator wallet', points: 10, detail: `Wallet is ${Math.floor(creatorAgeDays)} days old` });
      }
    }

    // --- Serial launcher pattern ---
    if (creatorPastLaunches !== null && creatorPastLaunches > 3) {
      factors.push({
        label: 'Serial token creator',
        points: Math.min(20, creatorPastLaunches * 3),
        detail: `This wallet has created ${creatorPastLaunches} other pump.fun tokens`,
      });
    }

    // --- Missing socials ---
    const socialsCount = [launch.hasTwitter, launch.hasTelegram, launch.hasWebsite].filter(Boolean).length;
    if (socialsCount === 0) {
      factors.push({ label: 'No socials linked', points: 10, detail: 'No Twitter, Telegram, or website in metadata' });
    }

    // --- Copycat name/symbol detection ---
    const copy = this.detectCopycat(launch, recentNames);
    if (copy) {
      factors.push({ label: 'Possible copycat', points: 15, detail: `Name/symbol closely resembles a recent trending token: "${copy}"` });
    }

    const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
    const score = Math.max(0, Math.min(100, rawScore));
    const level: RiskLevel = score <= RISK_LOW_MAX ? 'LOW' : score <= RISK_MEDIUM_MAX ? 'MEDIUM' : 'HIGH';

    return { score, level, factors };
  }

  private async getDevSupplyPct(launch: TokenLaunch): Promise<number | null> {
    try {
      const mint = new PublicKey(launch.mint);
      const largest = await this.connection.getTokenLargestAccounts(mint);
      const supply = await this.connection.getTokenSupply(mint);
      if (!largest.value.length || !supply.value.uiAmount) return null;

      // Find the account owned by the creator, if present among top holders
      const creatorAccount = largest.value.find(async (acc) => {
        const info = await this.connection.getParsedAccountInfo(acc.address);
        const owner = (info.value?.data as any)?.parsed?.info?.owner;
        return owner === launch.creator;
      });
      const amt = creatorAccount?.uiAmount ?? largest.value[0]?.uiAmount ?? 0;
      return (amt / supply.value.uiAmount) * 100;
    } catch {
      return null;
    }
  }

  private async getTopHolderPct(launch: TokenLaunch): Promise<number | null> {
    try {
      const mint = new PublicKey(launch.mint);
      const largest = await this.connection.getTokenLargestAccounts(mint);
      const supply = await this.connection.getTokenSupply(mint);
      if (!largest.value.length || !supply.value.uiAmount) return null;
      const top = largest.value[0]?.uiAmount ?? 0;
      return (top / supply.value.uiAmount) * 100;
    } catch {
      return null;
    }
  }

  private async getCreatorWalletAgeDays(creator: string): Promise<number | null> {
    try {
      const pubkey = new PublicKey(creator);
      const sigs = await this.connection.getSignaturesForAddress(pubkey, { limit: 1000 });
      if (!sigs.length) return 0;
      const oldest = sigs[sigs.length - 1];
      if (!oldest.blockTime) return null;
      const ageMs = Date.now() - oldest.blockTime * 1000;
      return ageMs / (1000 * 60 * 60 * 24);
    } catch {
      return null;
    }
  }

  private async getCreatorPastLaunches(creator: string): Promise<number | null> {
    // In production: query an indexer (e.g. Helius DAS API) for all pump.fun
    // "Create" txs signed by this wallet. Left as a stub here since it
    // requires a paid indexer for reliable results across full wallet history.
    return null;
  }

  private detectCopycat(launch: TokenLaunch, recentNames: string[]): string | null {
    const target = `${launch.name}${launch.symbol}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const name of recentNames) {
      const candidate = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!candidate || candidate === target) continue;
      if (this.levenshtein(target, candidate) <= 2 && candidate.length > 3) {
        return name;
      }
    }
    return null;
  }

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }
}
