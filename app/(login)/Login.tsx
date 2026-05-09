"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useAuth } from "@/app/(contexts)/auth";
import { UseRegisterAndAuth, LoadExistingUserByQCId } from "./registerAndAuth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useDeviceDetection } from "./deviceDetection";
import { authenticateTelegram, refreshTelegramSession } from "./actions";
import Loader from "@/app/(components)/Loader";

/** Resolve deep link destination from Telegram start_param */
function getDeepLinkDestination() {
  try {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (startParam?.startsWith("chat_")) {
      const chatId = startParam.replace("chat_", "");
      if (chatId) return `/ecosystem/chat/${chatId}` as const;
    }
    if (startParam?.startsWith("join_")) {
      return "/ecosystem/chat" as const;
    }
    // Broadcasts: `bcast-{handle}` for the channel, or
    // `bcast-{handle}-{postId}` for a specific post (fan-out deep link).
    if (startParam?.startsWith("bcast-")) {
      const rest = startParam.slice("bcast-".length);
      // Handles are [a-z0-9_]+ (no hyphens), so the first hyphen separates
      // the handle from the optional postId.
      const dashIdx = rest.indexOf("-");
      if (dashIdx === -1) {
        return rest
          ? (`/ecosystem/broadcasts/${rest}` as `/ecosystem/broadcasts/${string}`)
          : ("/ecosystem/chat?tab=discover&discoverTab=broadcasts" as const);
      }
      const handle = rest.slice(0, dashIdx);
      const postId = rest.slice(dashIdx + 1);
      if (handle && postId) {
        return `/ecosystem/broadcasts/${handle}/${postId}` as `/ecosystem/broadcasts/${string}/${string}`;
      }
      if (handle) {
        return `/ecosystem/broadcasts/${handle}` as `/ecosystem/broadcasts/${string}`;
      }
    }
    if (startParam === "alerts") {
      return "/wallet/settings/price-alerts" as const;
    }
    // Bot-generated intent (e.g. `ape <address>` command) — server-side
    // resolver page validates the intent and forwards to the right UI.
    if (startParam?.startsWith("intent_")) {
      const intentId = startParam.slice("intent_".length);
      if (intentId) return `/intent/${intentId}` as `/intent/${string}`;
    }
  } catch {}
  return "/home" as const;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const hasRedirected = useRef(false);
  /** Set to true once login data setters have completed (prevents redirect before data is ready) */
  const dataReady = useRef(false);
  /** Ensures the auto-Telegram-login attempt only fires once per page mount */
  const autoLoginAttempted = useRef(false);

  const router = useRouter();
  const authContext = useAuth();
  const {
    setTelegramId,
    SetMainQuantAmount,
    setRank,
    setDaily,
    setUsername,
    setWalletAddress,
    setQcUsername,
    setLastActiveTime,
    setRemainingSolveToEarn,
  } = useUserContext();
  const { setUserRank } = useLeaderboardContext();

  // Enable fullscreen mode for Telegram Mini App
  useDeviceDetection();

  // Hide back button on login screen
  useEffect(() => {
    window.Telegram?.WebApp?.BackButton.hide();
  }, []);

  // Reset redirect guards when user signs out (component stays mounted since
  // the login page is the logout destination). Without this, a re-login attempt
  // would see stale `true` values and either skip the redirect or skip the
  // data-ready gate.
  useEffect(() => {
    if (!authContext?.currentUser) {
      hasRedirected.current = false;
      dataReady.current = false;
      autoLoginAttempted.current = false;
    }
  }, [authContext?.currentUser]);

  // Auto-redirect once the user is signed in. On cold-start cached restores
  // (where Firebase Auth restored from IndexedDB but our session cookie is
  // missing/expired), silently re-issue the cookie from initData before
  // navigating, so the middleware sees a valid session.
  useEffect(() => {
    if (!authContext?.authLoading && authContext?.currentUser && !hasRedirected.current) {
      // Wait for the explicit-login data setters to finish before redirecting,
      // and surface errors instead of redirecting into a middleware loop.
      if (isLoading && !dataReady.current) return;
      if (rootError) return;

      hasRedirected.current = true;

      (async () => {
        try {
          let qcId: string | null = null;

          // Cold-restore: refresh the session cookie from initData. Uses
          // the lightweight refreshTelegramSession action (skips the
          // ~150ms Firebase Admin createCustomToken call — we already
          // have a cached Firebase user from IndexedDB).
          const initData = window.Telegram?.WebApp?.initData;
          const isColdRestore = !dataReady.current;
          if (initData && isColdRestore) {
            try {
              const result = await refreshTelegramSession({ initData: initData as string });
              if (result?.data?.telegramIdEncrypted) {
                qcId = result.data.telegramIdEncrypted;
              }
            } catch {
              // Expired/invalid initData — fall through to existing path
            }
          }

          // localStorage intact → redirect immediately (session is now fresh above)
          const storedTid = localStorage.getItem("telegramId");
          if (storedTid) {
            router.replace(getDeepLinkDestination());
            return;
          }

          // localStorage was cleared — rehydrate user data before redirecting
          if (!qcId) {
            router.replace(getDeepLinkDestination());
            return;
          }

          const data = await LoadExistingUserByQCId(qcId);
          if (data.status === "completed") {
            setTelegramId(data.telegramId);
            SetMainQuantAmount(data.MainQuantAmount);
            setRank(data.rank);
            setUserRank(data.userRank);
            setDaily(data.daily);
            setUsername(data.username);
            setWalletAddress(data.walletAddress);
            if (data.qcUsername) {
              setQcUsername(data.qcUsername);
            }
            if (data.userRank != null) sessionStorage.setItem("userLeaderRank", String(data.userRank));
            setLastActiveTime(data.lastActiveTime);
            setRemainingSolveToEarn(data.remainingSolveToEarn);
          }
        } catch (err) {
          console.error("Failed to rehydrate user data:", err);
        }
        router.replace(getDeepLinkDestination());
      })();
    }
  }, [authContext?.currentUser, authContext?.authLoading, isLoading, rootError, router]);

  const handleTelegramLogin = useCallback(async () => {
    setIsLoading(true);
    setRootError(null);
    try {
      if (
        typeof window === "undefined" ||
        !window.Telegram ||
        !window.Telegram.WebApp
      ) {
        setRootError("Telegram WebApp is not available. Please open this app from Telegram.");
        return;
      }

      const WebApp = window.Telegram.WebApp;
      WebApp.ready();

      // initData is populated synchronously by telegram-web-app.js when it
      // parses the URL hash, so on the happy path this loop doesn't run at
      // all. 1s max (10 * 100ms) is a fail-fast guard for the rare case
      // where the SDK script hasn't finished loading yet.
      let retries = 0;
      while (
        (!WebApp.initDataUnsafe?.user?.id || !WebApp.initData) &&
        retries < 10
      ) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }

      const initDataUnsafe = WebApp.initDataUnsafe;
      const initData = WebApp.initData;
      if (!initDataUnsafe?.user?.id || !initData) {
        throw new Error(
          "Telegram auth data is not available. Please reopen the app from Telegram and try again."
        );
      }

      const authResult = await authenticateTelegram({ initData: initData as string });
      if (authResult?.serverError) {
        throw new Error(authResult.serverError);
      }
      const customToken = authResult?.data?.customToken;
      const telegramIdEncrypted = authResult?.data?.telegramIdEncrypted;
      if (!customToken || !telegramIdEncrypted) {
        throw new Error("Telegram authentication response is incomplete.");
      }

      await authContext?.loginWithToken(customToken);

      let finalData = await UseRegisterAndAuth({
        telegramIdEncrypted,
        initDataUnsafe: WebApp.initDataUnsafe,
      });

      // Single immediate retry on transient failure — no backoff. Firestore
      // errors either resolve instantly or are legitimate; exponential
      // backoff added 4.5s of pure artificial wait on the failure path.
      if (finalData.status === "error") {
        finalData = await UseRegisterAndAuth({
          telegramIdEncrypted,
          initDataUnsafe: WebApp.initDataUnsafe,
        });
      }

      if (finalData.status === "error") {
        throw new Error("Failed to register/authenticate");
      }

      if (finalData.status === "completed") {
        setTelegramId(finalData.telegramId);
        SetMainQuantAmount(finalData.MainQuantAmount);
        setRank(finalData.rank);
        setUserRank(finalData.userRank);
        setDaily(finalData.daily);
        setUsername(finalData.username);
        setWalletAddress(finalData.walletAddress);
        if (finalData.qcUsername) {
          setQcUsername(finalData.qcUsername);
        }
        if (finalData.userRank != null) sessionStorage.setItem("userLeaderRank", String(finalData.userRank));
        setLastActiveTime(finalData.lastActiveTime);
        setRemainingSolveToEarn(finalData.remainingSolveToEarn);
      }
      // Signal that data is ready — the redirect useEffect will pick this up
      dataReady.current = true;
    } catch (err) {
      console.error("Telegram sign-in error:", err);
      setRootError(err instanceof Error ? err.message : "Failed to sign in with Telegram");
    } finally {
      setIsLoading(false);
    }
  }, [
    SetMainQuantAmount,
    authContext,
    setDaily,
    setLastActiveTime,
    setQcUsername,
    setRank,
    setRemainingSolveToEarn,
    setTelegramId,
    setUserRank,
    setUsername,
    setWalletAddress,
  ]);

  // Auto-trigger Telegram login when no user is signed in. With Telegram-only
  // auth, initData is always available inside the Mini App — there is no
  // reason to make the user click a button. The error state below is only
  // reached if the Telegram WebApp surface is unavailable (browser, broken
  // WebView) or auto-login failed outright.
  useEffect(() => {
    if (
      !authContext?.authLoading &&
      !authContext?.currentUser &&
      !autoLoginAttempted.current &&
      !isLoading &&
      !rootError &&
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.initData
    ) {
      autoLoginAttempted.current = true;
      handleTelegramLogin();
    }
  }, [
    authContext?.authLoading,
    authContext?.currentUser,
    handleTelegramLogin,
    isLoading,
    rootError,
  ]);

  // Show loader while auth is resolving, during Telegram login, or when
  // auto-login is about to fire (prevents a single-frame flash of the
  // error screen between authLoading→false and the effect setting
  // isLoading→true).
  const willAutoLogin = !authContext?.currentUser && !rootError &&
    typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
  const showLoader = authContext?.authLoading || isLoading || willAutoLogin;

  useEffect(() => {
    // Prefetch destinations for faster post-login navigation
    router.prefetch("/legal/terms");
    router.prefetch("/legal/privacy");
    router.prefetch("/home");
  }, [router]);

  // Auto-init guarantees that anyone reaching this page from inside Telegram
  // is signed in within ~1s. Show the loader for the entire normal path.
  // The error state below is only reached if the WebApp surface is genuinely
  // unavailable (browser open, broken WebView) — in which case there's no
  // recoverable action the user can take from here.
  if (showLoader || authContext?.currentUser) {
    return <Loader />;
  }

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-background p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/svg/logo-white.svg"
            alt="Quantum Club"
            width={48}
            height={48}
            className="dark:block hidden"
          />
          <Image
            src="/svg/logo-dark.svg"
            alt="Quantum Club"
            width={48}
            height={48}
            className="dark:hidden block"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {rootError ?? "Please open the app from Telegram to continue."}
        </p>
      </div>
    </div>
  );
}
