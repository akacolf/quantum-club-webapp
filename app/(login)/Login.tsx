"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { useAuth } from "@/app/(contexts)/auth";
import { UseRegisterAndAuth, lookupUserByEmail, LoadExistingUserByQCId } from "./registerAndAuth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useDeviceDetection } from "./deviceDetection";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

/** Resolve deep link destination from Telegram start_param */
function getDeepLinkDestination(): string {
  try {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (startParam?.startsWith("chat_")) {
      const chatId = startParam.replace("chat_", "");
      if (chatId) return `/ecosystem/chat/${chatId}`;
    }
    // join_ links need the chat list page to process (auto-join logic)
    if (startParam?.startsWith("join_")) {
      return "/ecosystem/chat";
    }
  } catch {}
  return "/home";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

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

  // Auto-redirect if user is already signed in (keepLoggedIn handled in auth context)
  // Uses a ref to prevent multiple redirects / redirect loops
  useEffect(() => {
    if (!authContext?.authLoading && authContext?.currentUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace(getDeepLinkDestination());
    }
  }, [authContext?.currentUser, authContext?.authLoading, router]);

  // Show loader while auth is resolving
  const showLoader = isPageLoading || authContext?.authLoading;

  useEffect(() => {
    // Prefetch auth-related pages for faster navigation
    router.prefetch("/signup");
    router.prefetch("/forgot-password");
    router.prefetch("/legal/terms");
    router.prefetch("/legal/privacy");
    router.prefetch("/home");
    
    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      setIsLoading(false);
      return;
    }

    try {
      await authContext?.loginWithEmail(email, password);

      // Look up existing QC account by email (independent of Telegram session)
      const existingQCId = await lookupUserByEmail(email);
      if (existingQCId) {
        // Load existing user data using their stored QC ID
        const data = await LoadExistingUserByQCId(existingQCId);

        if (data.status === "maintenance") {
          router.replace("/maintenance");
          return;
        }

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
            localStorage.setItem(`qcUsername_${data.telegramId}`, data.qcUsername);
          }
          if (data.userRank != null) sessionStorage.setItem("userLeaderRank", String(data.userRank));
          setLastActiveTime(data.lastActiveTime);
          setRemainingSolveToEarn(data.remainingSolveToEarn);
        }
      }

      router.replace(getDeepLinkDestination());
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        if (err.message.includes("user-not-found") || err.message.includes("invalid-credential")) {
          setError("Invalid email or password");
        } else if (err.message.includes("wrong-password")) {
          setError("Invalid email or password");
        } else if (err.message.includes("too-many-requests")) {
          setError("Too many failed attempts. Please try again later.");
        } else {
          setError("Failed to sign in. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (
        typeof window !== "undefined" &&
        window.Telegram &&
        window.Telegram.WebApp
      ) {
        const WebApp = window.Telegram.WebApp;
        WebApp.ready();

        // Retry briefly if Telegram payload is not ready yet
        let retries = 0;
        while (
          (!WebApp.initDataUnsafe?.user?.id || !WebApp.initData) &&
          retries < 20
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

        const responseAuth = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (!responseAuth.ok) {
          const errorData = await responseAuth
            .json()
            .catch(() => ({ error: "Authentication failed" }));
          throw new Error(
            errorData.error ||
              `Authentication failed (HTTP ${responseAuth.status})`
          );
        }

        const { customToken, telegramIdEncrypted } = await responseAuth.json();
        if (!customToken || !telegramIdEncrypted) {
          throw new Error("Telegram authentication response is incomplete.");
        }

        // User is explicitly signing in now; persist session across reloads.
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

        if (finalData.status === "maintenance") {
          router.replace("/maintenance");
          return;
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
            localStorage.setItem(`qcUsername_${finalData.telegramId}`, finalData.qcUsername);
          }
          if (finalData.userRank != null) sessionStorage.setItem("userLeaderRank", String(finalData.userRank));
          setLastActiveTime(finalData.lastActiveTime);
          setRemainingSolveToEarn(finalData.remainingSolveToEarn);
          router.replace(getDeepLinkDestination());
        }
      } else {
        setError("Telegram WebApp is not available. Please open this app from Telegram.");
      }
    } catch (err) {
      console.error("Telegram sign-in error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Telegram"
      );
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
            <h1 className="text-xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log in to your Quantum Club account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
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
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground">
                  Or continue with email
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon
                        icon={
                          showPassword
                            ? "solar:eye-closed-linear"
                            : "solar:eye-linear"
                        }
                        className="size-5"
                      />
                    </button>
                  </div>
                </div>

                {/* Keep me logged in */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="keepLoggedIn"
                    checked={authContext?.keepLoggedIn ?? true}
                    onCheckedChange={(checked) => authContext?.setKeepLoggedIn(!!checked)}
                  />
                  <Label htmlFor="keepLoggedIn" className="text-sm font-normal cursor-pointer">
                    Keep me logged in
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ButtonLoader size="sm" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </form>

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
