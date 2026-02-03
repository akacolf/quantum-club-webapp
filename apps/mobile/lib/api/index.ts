/**
 * API Service Layer for Quantum Club Mobile App
 * Handles all backend communication with the web app API
 */

// Base URL for API calls - points to the web app backend
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.space";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  authToken?: string
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// User API
export interface UserData {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  MainQuantAmount: number;
  rank?: number;
  walletAddress?: string;
  daily?: {
    streak: number;
    lastClaim?: string;
  };
  remainingSolveToEarn: number;
}

export interface UserRank {
  rank: number;
  totalUsers: number;
}

export async function getUserData(telegramId: string, authToken?: string): Promise<ApiResponse<UserData>> {
  return apiRequest<UserData>(`/api/getUserValues?telegramId=${telegramId}`, {}, authToken);
}

export async function getUserRank(telegramId: string, authToken?: string): Promise<ApiResponse<UserRank>> {
  return apiRequest<UserRank>(`/api/checkUserRank?telegramId=${telegramId}`, {}, authToken);
}

// Tasks API
export interface Task {
  id: string;
  description: string;
  platform: string;
  category: "Limited" | "In-app" | "Partners";
  buttonText: string;
  quant: number;
  completed: boolean;
  url?: string;
}

export async function getTasks(telegramId: string, authToken?: string): Promise<ApiResponse<Task[]>> {
  return apiRequest<Task[]>(`/api/tasks?telegramId=${telegramId}`, {}, authToken);
}

export async function completeTask(
  taskId: string,
  telegramId: string,
  authToken?: string
): Promise<ApiResponse<{ success: boolean; reward: number }>> {
  return apiRequest(
    `/api/tasks/complete`,
    {
      method: "POST",
      body: JSON.stringify({ taskId, telegramId }),
    },
    authToken
  );
}

// Daily Check-in API
export interface DailyCheckInResult {
  success: boolean;
  streak: number;
  reward: number;
  nextClaimTime?: string;
}

export async function claimDailyCheckIn(
  telegramId: string,
  authToken?: string
): Promise<ApiResponse<DailyCheckInResult>> {
  return apiRequest(
    `/api/daily-checkin`,
    {
      method: "POST",
      body: JSON.stringify({ telegramId }),
    },
    authToken
  );
}

// Solve to Earn API
export interface SolveToEarnResult {
  success: boolean;
  correct: boolean;
  reward?: number;
  remaining: number;
}

export async function submitSolveToEarn(
  telegramId: string,
  questionId: string,
  answer: string,
  authToken?: string
): Promise<ApiResponse<SolveToEarnResult>> {
  return apiRequest(
    `/api/solve-to-earn`,
    {
      method: "POST",
      body: JSON.stringify({ telegramId, questionId, answer }),
    },
    authToken
  );
}

// Referral API
export interface Referral {
  id: string;
  username: string;
  quantamount: number;
}

export interface ReferralStats {
  referralsCount: number;
  secondTierCount: number;
  pendingRewards: number;
  tonEarnings: number;
  referrals: Referral[];
}

export async function getReferralStats(
  telegramId: string,
  authToken?: string
): Promise<ApiResponse<ReferralStats>> {
  return apiRequest<ReferralStats>(`/api/referrals?telegramId=${telegramId}`, {}, authToken);
}

export async function claimReferralRewards(
  telegramId: string,
  rewardType: "qntm" | "ton",
  authToken?: string
): Promise<ApiResponse<{ success: boolean; claimedAmount: number }>> {
  const endpoint = rewardType === "ton" ? "/api/claim-referral-ton" : "/api/claim-tier2-rewards";
  return apiRequest(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify({ telegramId }),
    },
    authToken
  );
}

// QNTM Transfer API
export async function transferQntm(
  fromTelegramId: string,
  toAddress: string,
  amount: number,
  authToken?: string
): Promise<ApiResponse<{ success: boolean; txHash?: string }>> {
  return apiRequest(
    `/api/transfer-qntm`,
    {
      method: "POST",
      body: JSON.stringify({ fromTelegramId, toAddress, amount }),
    },
    authToken
  );
}

export { apiRequest, API_BASE_URL };
