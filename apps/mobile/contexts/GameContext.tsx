import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserData, getUserRank } from "~/lib/api";

interface GameContextType {
  username: string | null;
  setUsername: (value: string | null) => void;
  telegramId: string | null;
  setTelegramId: (value: string | null) => void;
  mainQuantAmount: string;
  setMainQuantAmount: (value: string) => void;
  rank: string | null;
  setRank: (value: string | null) => void;
  daily: number;
  setDaily: (value: number) => void;
  remainingSolveToEarn: number;
  setRemainingSolveToEarn: (value: number) => void;
  walletAddress: string | null;
  setWalletAddress: (value: string | null) => void;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

const GameContext = createContext<GameContextType>({} as GameContextType);

const STORAGE_KEYS = {
  USERNAME: "@qc_username",
  TELEGRAM_ID: "@qc_telegram_id",
  QUANT_AMOUNT: "@qc_quant_amount",
  RANK: "@qc_rank",
  DAILY: "@qc_daily",
  WALLET_ADDRESS: "@qc_wallet_address",
  SOLVE_TO_EARN: "@qc_solve_to_earn",
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [mainQuantAmount, setMainQuantAmount] = useState<string>("0");
  const [rank, setRank] = useState<string | null>(null);
  const [daily, setDaily] = useState<number>(0);
  const [remainingSolveToEarn, setRemainingSolveToEarn] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Persist values when they change
  const persistValue = async (key: string, value: string | null) => {
    try {
      if (value === null) {
        await AsyncStorage.removeItem(key);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error persisting ${key}:`, error);
    }
  };

  // Refresh user data from backend
  const refreshUserData = useCallback(async () => {
    if (!telegramId) return;

    try {
      const [userDataRes, rankRes] = await Promise.all([
        getUserData(telegramId),
        getUserRank(telegramId),
      ]);

      if (userDataRes.success && userDataRes.data) {
        const data = userDataRes.data;
        if (data.username) {
          setUsername(data.username);
          persistValue(STORAGE_KEYS.USERNAME, data.username);
        }
        if (data.MainQuantAmount !== undefined) {
          const amount = data.MainQuantAmount.toString();
          setMainQuantAmount(amount);
          persistValue(STORAGE_KEYS.QUANT_AMOUNT, amount);
        }
        if (data.daily?.streak !== undefined) {
          setDaily(data.daily.streak);
          persistValue(STORAGE_KEYS.DAILY, data.daily.streak.toString());
        }
        if (data.remainingSolveToEarn !== undefined) {
          setRemainingSolveToEarn(data.remainingSolveToEarn);
          persistValue(STORAGE_KEYS.SOLVE_TO_EARN, data.remainingSolveToEarn.toString());
        }
        if (data.walletAddress) {
          setWalletAddress(data.walletAddress);
          persistValue(STORAGE_KEYS.WALLET_ADDRESS, data.walletAddress);
        }
      }

      if (rankRes.success && rankRes.data) {
        const rankStr = `#${rankRes.data.rank}`;
        setRank(rankStr);
        persistValue(STORAGE_KEYS.RANK, rankStr);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  }, [telegramId]);

  // Load stored values on mount
  useEffect(() => {
    const loadStoredValues = async () => {
      try {
        const [
          storedUsername,
          storedTelegramId,
          storedQuantAmount,
          storedRank,
          storedDaily,
          storedWalletAddress,
          storedSolveToEarn,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USERNAME),
          AsyncStorage.getItem(STORAGE_KEYS.TELEGRAM_ID),
          AsyncStorage.getItem(STORAGE_KEYS.QUANT_AMOUNT),
          AsyncStorage.getItem(STORAGE_KEYS.RANK),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY),
          AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS),
          AsyncStorage.getItem(STORAGE_KEYS.SOLVE_TO_EARN),
        ]);

        if (storedUsername) setUsername(storedUsername);
        if (storedTelegramId) setTelegramId(storedTelegramId);
        if (storedQuantAmount) setMainQuantAmount(storedQuantAmount);
        if (storedRank) setRank(storedRank);
        if (storedDaily) setDaily(parseInt(storedDaily, 10));
        if (storedWalletAddress) setWalletAddress(storedWalletAddress);
        if (storedSolveToEarn)
          setRemainingSolveToEarn(parseInt(storedSolveToEarn, 10));
      } catch (error) {
        console.error("Error loading stored values:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredValues();
  }, []);

  // Fetch fresh data when telegramId becomes available
  useEffect(() => {
    if (telegramId && !isLoading) {
      refreshUserData();
    }
  }, [telegramId, isLoading, refreshUserData]);

  // Wrapped setters that also persist
  const wrappedSetUsername = (value: string | null) => {
    setUsername(value);
    persistValue(STORAGE_KEYS.USERNAME, value);
  };

  const wrappedSetTelegramId = (value: string | null) => {
    setTelegramId(value);
    persistValue(STORAGE_KEYS.TELEGRAM_ID, value);
  };

  const wrappedSetMainQuantAmount = (value: string) => {
    setMainQuantAmount(value);
    persistValue(STORAGE_KEYS.QUANT_AMOUNT, value);
  };

  const wrappedSetRank = (value: string | null) => {
    setRank(value);
    persistValue(STORAGE_KEYS.RANK, value);
  };

  const wrappedSetDaily = (value: number) => {
    setDaily(value);
    persistValue(STORAGE_KEYS.DAILY, value.toString());
  };

  const wrappedSetRemainingSolveToEarn = (value: number) => {
    setRemainingSolveToEarn(value);
    persistValue(STORAGE_KEYS.SOLVE_TO_EARN, value.toString());
  };

  const wrappedSetWalletAddress = (value: string | null) => {
    setWalletAddress(value);
    persistValue(STORAGE_KEYS.WALLET_ADDRESS, value);
  };

  const value = useMemo(
    () => ({
      username,
      setUsername: wrappedSetUsername,
      telegramId,
      setTelegramId: wrappedSetTelegramId,
      mainQuantAmount,
      setMainQuantAmount: wrappedSetMainQuantAmount,
      rank,
      setRank: wrappedSetRank,
      daily,
      setDaily: wrappedSetDaily,
      remainingSolveToEarn,
      setRemainingSolveToEarn: wrappedSetRemainingSolveToEarn,
      walletAddress,
      setWalletAddress: wrappedSetWalletAddress,
      isLoading,
      refreshUserData,
    }),
    [
      username,
      telegramId,
      mainQuantAmount,
      rank,
      daily,
      remainingSolveToEarn,
      walletAddress,
      isLoading,
      refreshUserData,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
}

export { STORAGE_KEYS };
