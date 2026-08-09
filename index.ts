export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskFactor {
  label: string;
  points: number; // contribution to the 0-100 risk score
  detail: string;
}

export interface RiskAssessment {
  score: number; // 0-100, higher = riskier
  level: RiskLevel;
  factors: RiskFactor[];
}

export interface TokenLaunch {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  createdAt: number; // unix ms
  signature: string; // tx signature of the create instruction
  uri?: string; // metadata URI (image, socials)
  hasTwitter?: boolean;
  hasTelegram?: boolean;
  hasWebsite?: boolean;
  devSupplyPct?: number; // % of supply the creator holds right after mint
  topHolderPct?: number; // % held by largest non-creator holder
  creatorWalletAgeDays?: number;
  creatorPastLaunches?: number; // how many other pump.fun tokens this wallet has created
  risk?: RiskAssessment;
}
