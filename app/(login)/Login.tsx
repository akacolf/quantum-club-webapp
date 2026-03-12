"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useForm } from "@tanstack/react-form";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

import { useAuth } from "@/app/(contexts)/auth";
import { UseRegisterAndAuth, LoadExistingUserByQCId } from "./registerAndAuth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useDeviceDetection } from "./deviceDetection";
import { authenticateTelegram, checkExistingUser } from "./actions";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

/** Resolve deep link destination from Telegram start_param */
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
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const hasRedirected = useRef(false);
  /** Set to true once login data setters have completed (prevents redirect before data is ready) */
  const dataReady = useRef(false);

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

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  // Enable fullscreen mode for Telegram Mini App
  useDeviceDetection();

  // Hide back button on login screen
  useEffect(() => {
    window.Telegram?.WebApp?.BackButton.hide();
  }, []);

  // Auto-redirect if user is already signed in (keepLoggedIn handled in auth context)
  // Uses a ref to prevent multiple redirects / redirect loops
  // Also rehydrates localStorage if it was cleared (e.g. cookies deleted externally)
  //
  // For explicit logins (Telegram / email), the login handler sets dataReady.current = true
  // after all data setters complete, preventing a premature redirect from the
  // onAuthStateChanged → authLoading=false race.
  useEffect(() => {
    if (!authContext?.authLoading && authContext?.currentUser && !hasRedirected.current) {
      // If an explicit login is in progress, wait for dataReady.
      // Also block if the login failed (rootError set) — the user needs to see the
      // error instead of being redirected into a loop with the middleware.
      if (isLoading && !dataReady.current) return;
      if (rootError) return;

      hasRedirected.current = true;

      const storedTid = localStorage.getItem("telegramId");
      if (storedTid) {
        // localStorage intact → redirect immediately
        router.replace(getDeepLinkDestination());
        return;
      }

      // localStorage was cleared — rehydrate user data before redirecting
      (async () => {
        try {
          const user = authContext.currentUser!;
          let qcId: string | null = null;

          // Email users: look up QC ID by email (server-side to bypass Firestore rules)
          if (user.email) {
            const result = await checkExistingUser({ email: user.email });
            qcId = result?.data?.qcId ?? null;
          }

          // Telegram users: get encrypted ID from auth endpoint
          if (!qcId && window.Telegram?.WebApp?.initData) {
            try {
              const authResult = await authenticateTelegram({ initData: window.Telegram.WebApp.initData as string });
              if (authResult?.data?.telegramIdEncrypted) {
                qcId = authResult.data.telegramIdEncrypted;
              }
            } catch {}
          }

          if (!qcId) {
            // Can't determine identity — redirect without rehydration
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setters are stable references
  }, [authContext?.currentUser, authContext?.authLoading, isLoading, rootError, router]);

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

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setRootError(null);

    try {
      await authContext?.loginWithEmail(data.email, data.password);

      // Look up existing QC account by email (server-side to bypass Firestore rules)
      const lookupResult = await checkExistingUser({ email: data.email });
      const existingQCId = lookupResult?.data?.qcId ?? null;
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
          }
          if (data.userRank != null) sessionStorage.setItem("userLeaderRank", String(data.userRank));
          setLastActiveTime(data.lastActiveTime);
          setRemainingSolveToEarn(data.remainingSolveToEarn);
        }
      }
      // Signal that data is ready — the redirect useEffect will pick this up
      dataReady.current = true;
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        if (err.message.includes("user-not-found") || err.message.includes("invalid-credential")) {
          setRootError("Invalid email or password");
        } else if (err.message.includes("wrong-password")) {
          setRootError("Invalid email or password");
        } else if (err.message.includes("too-many-requests")) {
          setRootError("Too many failed attempts. Please try again later.");
        } else {
          setRootError("Failed to sign in. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    setRootError(null);
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

        const authResult = await authenticateTelegram({ initData: initData as string });
        if (authResult?.serverError) {
          throw new Error(authResult.serverError);
        }
        const customToken = authResult?.data?.customToken;
        const telegramIdEncrypted = authResult?.data?.telegramIdEncrypted;
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
          }
          if (finalData.userRank != null) sessionStorage.setItem("userLeaderRank", String(finalData.userRank));
          setLastActiveTime(finalData.lastActiveTime);
          setRemainingSolveToEarn(finalData.remainingSolveToEarn);
        }
        // Signal that data is ready — the redirect useEffect will pick this up
        dataReady.current = true;
      } else {
        setRootError("Telegram WebApp is not available. Please open this app from Telegram.");
      }
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
            <h1 className="text-xl font-semibold">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log in to your Quantum Club account
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
            <div className="grid gap-6">
              {rootError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {rootError}
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
                <form.Field
                  name="email"
                  >
                  {(field) => {
                    const hasErrors = field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasErrors}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          id={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={hasErrors}
                          placeholder="Your email address"
                          disabled={isLoading}
                          autoComplete="email"
                        />
                        {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                      </Field>
                    );
                  }}
                </form.Field>
                <form.Field
                  name="password"
                  >
                  {(field) => {
                    const hasErrors = field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasErrors}>
                        <div className="flex items-center">
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <Link
                            href="/forgot-password"
                            className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Input
                            id={field.name}
                            type={showPassword ? "text" : "password"}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={hasErrors}
                            placeholder="Enter your password"
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
                        {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                      </Field>
                    );
                  }}
                </form.Field>

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
