"use client";

import { useState, useEffect } from "react";
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
import { UseRegisterAndAuth } from "@/app/(login)/registerAndAuth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useDeviceDetection } from "@/app/(login)/deviceDetection";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const authContext = useAuth();
  const {
    setTelegramId,
    SetMainQuantAmount,
    setRank,
    setDaily,
    setUsername,
    setWalletAddress,
    setLastActiveTime,
    setRemainingSolveToEarn,
  } = useUserContext();
  const { setUserRank } = useLeaderboardContext();

  // Enable fullscreen mode for Telegram Mini App
  useDeviceDetection();
  
  // Telegram back button to return to login
  useTelegramBackButton("/");

  useEffect(() => {
    // Prefetch auth-related pages for faster navigation
    router.prefetch("/");
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

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      // Check if email is already linked to an existing QC account
      const checkRes = await fetch("/api/check-existing-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { exists } = await checkRes.json();
      if (exists) {
        setError("An account with this email already exists. Please sign in instead.");
        setIsLoading(false);
        return;
      }

      // Create Firebase account with email verification
      await authContext?.signUpWithEmail(email, password);

      // Register with TG ID (since we're in TG Mini App)
      if (
        typeof window !== "undefined" &&
        window.Telegram &&
        window.Telegram.WebApp
      ) {
        const WebApp = window.Telegram.WebApp;
        WebApp.ready();

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
        if (initDataUnsafe?.user?.id && initData) {
          const authRes = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          });

          if (!authRes.ok) {
            throw new Error("Telegram session authentication failed");
          }

          const { telegramIdEncrypted } = await authRes.json();
          if (!telegramIdEncrypted) {
            throw new Error("Failed to resolve Telegram ID");
          }

          // Store email in the user's Firestore profile
          const data = await UseRegisterAndAuth({
            telegramIdEncrypted,
            initDataUnsafe,
            email,
          });

          if (data.status === "maintenance") {
            router.replace("/maintenance");
            return;
          }

          if (data.status === "completed") {
            setTelegramId(data.telegramId);
            SetMainQuantAmount(data.MainQuantAmount);
            setRank(data.rank);
            setUserRank(data.userRank);
            if (data.userRank != null) sessionStorage.setItem("userLeaderRank", String(data.userRank));
            setDaily(data.daily);
            setUsername(data.username);
            setWalletAddress(data.walletAddress);
            setLastActiveTime(data.lastActiveTime);
            setRemainingSolveToEarn(data.remainingSolveToEarn);
          }
        }
      }

      router.replace("/home");
    } catch (err) {
      console.error("Sign up error:", err);
      if (err instanceof Error) {
        if (err.message.includes("email-already-in-use")) {
          setError("An account with this email already exists");
        } else if (err.message.includes("invalid-email")) {
          setError("Please enter a valid email address");
        } else if (err.message.includes("weak-password")) {
          setError("Password is too weak. Please use a stronger password");
        } else {
          setError("Failed to create account. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramSignUp = async () => {
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

        // Wait for initDataUnsafe.user to be available (up to 3s)
        let retries = 0;
        while (
          (!WebApp.initDataUnsafe?.user?.id || !WebApp.initData) &&
          retries < 30
        ) {
          await new Promise((r) => setTimeout(r, 100));
          retries++;
        }

        const initDataUnsafe = WebApp.initDataUnsafe;
        const initData = WebApp.initData;
        if (!initDataUnsafe?.user?.id || !initData) {
          throw new Error("Telegram user data not available. Please try again.");
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

        // Check if this Telegram user already has an account
        const checkRes = await fetch("/api/check-existing-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qcId: telegramIdEncrypted }),
        });
        const { exists } = await checkRes.json();
        if (exists) {
          setError("You already have an account. Please sign in instead.");
          setIsLoading(false);
          return;
        }

        // Enable keepLoggedIn since user is actively signing up
        authContext?.setKeepLoggedIn(true);
        await authContext?.loginWithToken(customToken);

        const data = await UseRegisterAndAuth({
          telegramIdEncrypted,
          initDataUnsafe,
        });

        if (data.status === "maintenance") {
          router.replace("/maintenance");
          return;
        }

        if (data.status === "error") {
          throw new Error("Failed to register/authenticate");
        }

        if (data.status === "completed") {
          setTelegramId(data.telegramId);
          SetMainQuantAmount(data.MainQuantAmount);
          setRank(data.rank);
          setUserRank(data.userRank);
          if (data.userRank != null) sessionStorage.setItem("userLeaderRank", String(data.userRank));
          setDaily(data.daily);
          setUsername(data.username);
          setWalletAddress(data.walletAddress);
          setLastActiveTime(data.lastActiveTime);
          setRemainingSolveToEarn(data.remainingSolveToEarn);
          router.replace("/home");
        }
      } else {
        setError("Telegram WebApp is not available. Please open this app from Telegram.");
      }
    } catch (err) {
      console.error("Telegram sign-up error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sign up with Telegram"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-6 md:p-10 pb-16">
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
            <h1 className="text-xl font-semibold">Create an account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign up to get started with Quantum Club
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
                  onClick={handleTelegramSignUp}
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
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
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
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon
                        icon={
                          showConfirmPassword
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
                    "Create Account"
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign in
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
