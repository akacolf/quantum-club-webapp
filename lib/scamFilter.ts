/**
 * Scam Token Filter Utility
 * 
 * Detects potentially suspicious tokens based on various heuristics:
 * - Known scam token addresses (blacklist)
 * - Suspicious naming patterns (copying legitimate token names)
 * - Zero or near-zero liquidity indicators
 * - Unusual decimals
 * - Recent contract deployment with suspicious patterns
 */

// Known scam token addresses (TON network)
// This list should be periodically updated from community sources
const BLACKLISTED_ADDRESSES: Set<string> = new Set([
  // Add known scam token addresses here
  // Format: raw address without bounceable encoding
]);

// Known legitimate token symbols that are commonly impersonated
const LEGITIMATE_TOKENS: Record<string, { name: string; addresses: string[] }> = {
  USDT: {
    name: "Tether USD",
    addresses: [
      "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs", // Official USDT on TON
    ],
  },
  USDC: {
    name: "USD Coin",
    addresses: [
      "EQC61IQRl0_la95t27xhIpjxZt32vl1QQVF2UgTNuvD18W-4", // Official USDC on TON
    ],
  },
  NOT: {
    name: "Notcoin",
    addresses: [
      "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT",
    ],
  },
  DOGS: {
    name: "Dogs",
    addresses: [
      "EQCvxJy4eG8hyHBFsZ7eePxrRsKNK4fXpEJ5LO5y3lU7gIxB", // Example - verify actual address
    ],
  },
  TON: {
    name: "Toncoin",
    addresses: [], // Native token
  },
};

// Suspicious patterns in token names
const SUSPICIOUS_NAME_PATTERNS = [
  /airdrop/i,
  /claim/i,
  /free\s*(money|token|coin)/i,
  /100x/i,
  /1000x/i,
  /guaranteed/i,
  /instant\s*profit/i,
  /giveaway/i,
  /elon/i, // Often used in scam tokens
  /reward/i,
  /bonus/i,
  /limited\s*time/i,
  /hurry/i,
  /urgent/i,
];

// Suspicious patterns in token symbols
const SUSPICIOUS_SYMBOL_PATTERNS = [
  /^FREE/i,
  /^CLAIM/i,
  /^WIN/i,
  /^REWARD/i,
  /^BONUS/i,
  /AIRDROP/i,
  /^\$\$\$/,
];

export interface TokenRiskAssessment {
  isScam: boolean;
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100
  warnings: string[];
  details: {
    isBlacklisted: boolean;
    isSuspiciousName: boolean;
    isImpersonating: boolean;
    hasUnusualDecimals: boolean;
    hasZeroValue: boolean;
    isHiddenRecommended: boolean;
  };
}

export interface TokenInfo {
  symbol: string;
  name: string;
  address?: string;
  decimals?: number;
  usdValue?: number;
  balance?: string;
  image?: string;
}

/**
 * Assess the risk level of a token
 */
export function assessTokenRisk(token: TokenInfo): TokenRiskAssessment {
  const warnings: string[] = [];
  let riskScore = 0;

  const details = {
    isBlacklisted: false,
    isSuspiciousName: false,
    isImpersonating: false,
    hasUnusualDecimals: false,
    hasZeroValue: false,
    isHiddenRecommended: false,
  };

  // 1. Check blacklist
  if (token.address && BLACKLISTED_ADDRESSES.has(token.address)) {
    details.isBlacklisted = true;
    warnings.push("This token address is on the known scam list");
    riskScore += 100; // Immediate critical
  }

  // 2. Check for impersonation of legitimate tokens
  const upperSymbol = token.symbol.toUpperCase().trim();
  const legitimateToken = LEGITIMATE_TOKENS[upperSymbol];
  
  if (legitimateToken && token.address) {
    const isLegitimate = legitimateToken.addresses.some(
      addr => addr.toLowerCase() === token.address!.toLowerCase()
    );
    
    if (!isLegitimate && legitimateToken.addresses.length > 0) {
      details.isImpersonating = true;
      warnings.push(`This may be impersonating ${legitimateToken.name} (${upperSymbol})`);
      riskScore += 50;
    }
  }

  // 3. Check suspicious name patterns
  for (const pattern of SUSPICIOUS_NAME_PATTERNS) {
    if (pattern.test(token.name)) {
      details.isSuspiciousName = true;
      warnings.push("Token name contains suspicious keywords");
      riskScore += 30;
      break;
    }
  }

  // 4. Check suspicious symbol patterns
  for (const pattern of SUSPICIOUS_SYMBOL_PATTERNS) {
    if (pattern.test(token.symbol)) {
      details.isSuspiciousName = true;
      warnings.push("Token symbol contains suspicious patterns");
      riskScore += 25;
      break;
    }
  }

  // 5. Check unusual decimals (most tokens use 9 on TON)
  if (token.decimals !== undefined && (token.decimals < 0 || token.decimals > 18)) {
    details.hasUnusualDecimals = true;
    warnings.push("Token has unusual decimal places");
    riskScore += 15;
  }

  // 6. Check for zero value with large balance (airdrop spam)
  const balance = parseFloat(token.balance || "0");
  if (balance > 0 && (token.usdValue === 0 || token.usdValue === undefined)) {
    details.hasZeroValue = true;
    warnings.push("Token has no market value (possibly airdrop spam)");
    riskScore += 20;
  }

  // 7. Very large unexpected balance (classic airdrop scam)
  if (balance > 1000000 && (token.usdValue === 0 || token.usdValue === undefined)) {
    warnings.push("Suspiciously large airdrop with no value");
    riskScore += 25;
  }

  // 8. Check for extremely similar names to legitimate tokens (typosquatting)
  const lowerName = token.name.toLowerCase();
  for (const [, legit] of Object.entries(LEGITIMATE_TOKENS)) {
    const legitNameLower = legit.name.toLowerCase();
    if (
      lowerName !== legitNameLower &&
      (lowerName.includes(legitNameLower) || 
       legitNameLower.includes(lowerName) ||
       levenshteinDistance(lowerName, legitNameLower) <= 2)
    ) {
      const isActuallyLegit = token.address && legit.addresses.some(
        addr => addr.toLowerCase() === token.address!.toLowerCase()
      );
      if (!isActuallyLegit) {
        details.isImpersonating = true;
        warnings.push(`Name is very similar to ${legit.name} - possible impersonation`);
        riskScore += 35;
        break;
      }
    }
  }

  // Calculate risk level
  let riskLevel: TokenRiskAssessment["riskLevel"];
  if (riskScore >= 80) {
    riskLevel = "critical";
  } else if (riskScore >= 50) {
    riskLevel = "high";
  } else if (riskScore >= 30) {
    riskLevel = "medium";
  } else if (riskScore >= 10) {
    riskLevel = "low";
  } else {
    riskLevel = "safe";
  }

  // Determine if hiding is recommended
  details.isHiddenRecommended = riskScore >= 50;

  return {
    isScam: riskScore >= 80,
    riskLevel,
    riskScore: Math.min(100, riskScore),
    warnings,
    details,
  };
}

/**
 * Filter tokens and add risk assessment
 */
export function filterScamTokens<T extends TokenInfo>(
  tokens: T[],
  options: {
    hideHighRisk?: boolean;
    hideNoValue?: boolean;
  } = {}
): (T & { riskAssessment: TokenRiskAssessment })[] {
  const { hideHighRisk = false, hideNoValue = false } = options;

  return tokens
    .map(token => ({
      ...token,
      riskAssessment: assessTokenRisk(token),
    }))
    .filter(token => {
      if (hideHighRisk && token.riskAssessment.riskLevel === "critical") {
        return false;
      }
      if (hideNoValue && token.riskAssessment.details.hasZeroValue) {
        return false;
      }
      return true;
    });
}

/**
 * Get tokens sorted by risk (safest first)
 */
export function sortTokensByRisk<T extends TokenInfo>(
  tokens: T[]
): (T & { riskAssessment: TokenRiskAssessment })[] {
  return filterScamTokens(tokens).sort((a, b) => 
    a.riskAssessment.riskScore - b.riskAssessment.riskScore
  );
}

/**
 * Calculate Levenshtein distance for detecting typosquatting
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Quick check if a token is likely a scam
 */
export function isLikelyScam(token: TokenInfo): boolean {
  const assessment = assessTokenRisk(token);
  return assessment.isScam;
}

/**
 * Get risk badge color and label
 */
export function getRiskBadgeProps(riskLevel: TokenRiskAssessment["riskLevel"]): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
} {
  switch (riskLevel) {
    case "critical":
      return {
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        label: "Scam Alert",
      };
    case "high":
      return {
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        label: "High Risk",
      };
    case "medium":
      return {
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        label: "Caution",
      };
    case "low":
      return {
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        label: "Low Risk",
      };
    case "safe":
    default:
      return {
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        label: "Verified",
      };
  }
}
