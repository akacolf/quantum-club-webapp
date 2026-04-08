"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/app/(contexts)/auth";
import { UseRegisterAndAuth, LoadExistingUserByQCId } from "./registerAndAuth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useDeviceDetection } from "./deviceDetection";
import { authenticateTelegram } from "./actions";
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
  } catch {}
  return "/home" as const;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
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

          const initData = window.Telegram?.WebApp?.initData;
          const isColdRestore = !dataReady.current;
          if (initData && isColdRestore) {
            try {
              const authResult = await authenticateTelegram({ initData: initData as string });
              if (authResult?.data?.telegramIdEncrypted) {
                qcId = authResult.data.telegramIdEncrypted;
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

  // Auto-trigger Telegram login when no user is signed in. With Telegram-only
  // auth, initData is always available inside the Mini App — there is no
  // reason to make the user click a button. Skipped if the user explicitly
  // signed out (keepLoggedIn=false), so they can stay signed out if they
  // chose to. The manual button below is the fallback for that case and for
  // when the Telegram WebApp surface is somehow unavailable.
  useEffect(() => {
    if (
      !authContext?.authLoading &&
      !authContext?.currentUser &&
      !autoLoginAttempted.current &&
      !isLoading &&
      !rootError &&
      authContext?.keepLoggedIn !== false &&
      typeof window !== "undefined" &&
      window.Telegram?.WebApp?.initData
    ) {
      autoLoginAttempted.current = true;
      handleTelegramLogin();
    }
  }, [
    authContext?.authLoading,
    authContext?.currentUser,
    authContext?.keepLoggedIn,
    isLoading,
    rootError,
  ]);

  // Show loader while auth is resolving OR while a Telegram login is in
  // flight. The user should never see the manual sign-in button unless
  // auto-login was skipped or has failed.
  const showLoader = isPageLoading || authContext?.authLoading || isLoading;

  useEffect(() => {
    // Prefetch destinations for faster post-login navigation
    router.prefetch("/legal/terms");
    router.prefetch("/legal/privacy");
    router.prefetch("/home");

    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, [router]);

  const handleTelegramLogin = async () => {
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

      // Retry briefly if Telegram payload is not ready yet (up to 5s)
      let retries = 0;
      while (
        (!WebApp.initDataUnsafe?.user?.id || !WebApp.initData) &&
        retries < 50
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

      // User is signing in; persist session across reloads.
      authContext?.setKeepLoggedIn(true);
      await authContext?.loginWithToken(customToken);

      const data = await UseRegisterAndAuth({
        telegramIdEncrypted,
        initDataUnsafe: WebApp.initDataUnsafe,
      });

      // Retry up to 2 more times on error with backoff
      let finalData = data;
      if (data.status === "error") {
        for (let attempt = 1; attempt <= 2; attempt++) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          finalData = await UseRegisterAndAuth({
            telegramIdEncrypted,
            initDataUnsafe: WebApp.initDataUnsafe,
          });
          if (finalData.status !== "error") break;
        }
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
  };

  if (showLoader) {
    return <Loader />;
  }

  // If user is already signed in, show loader while redirecting
  if (authContext?.currentUser) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6")}>
          <div className="text-center">
            <div className="flex justify-center mb-4">
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
            <h1 className="text-xl font-semibold">Welcome to Quantum Club</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with Telegram to continue
            </p>
          </div>

          {rootError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {rootError}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleTelegramLogin}
            disabled={isLoading}
          >
            <Icon icon="logos:telegram" className="size-5" />
            Continue with Telegram
          </Button>

          <p className="text-balance text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              href="/legal/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
