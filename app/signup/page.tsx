"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

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
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
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
    setLastActiveTime,
    setRemainingSolveToEarn,
  } = useUserContext();
  const { setUserRank } = useLeaderboardContext();

  // Enable fullscreen mode for Telegram Mini App
  useDeviceDetection();
  
  // Telegram back button to return to login
  useTelegramBackButton("/");

  // Redirect to /home once auth cookie is set (after signup completes)
  useEffect(() => {
    if (signupComplete && !authContext?.authLoading && authContext?.currentUser && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/home");
    }
  }, [signupComplete, authContext?.authLoading, authContext?.currentUser, router]);

  useEffect(() => {
    // Prefetch auth-related pages for faster navigation
    router.prefetch("/");
    router.prefetch("/legal/terms");
    router.prefetch("/legal/privacy");
    router.prefetch("/home");
    
    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, [router]);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    form.clearErrors("root");

    try {
      // Check if email is already linked to an existing QC account
      const checkRes = await fetch("/api/check-existing-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const { exists } = await checkRes.json();
      if (exists) {
        form.setError("root", { message: "An account with this email already exists. Please sign in instead." });
        setIsLoading(false);
        return;
      }

      // Also check if the Telegram user already has an account (prevent duplicate via email)
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

        const initData = WebApp.initData;
        if (initData) {
          const authRes = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          });

          if (authRes.ok) {
            const { telegramIdEncrypted } = await authRes.json();
            if (telegramIdEncrypted) {
              const tgCheckRes = await fetch("/api/check-existing-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qcId: telegramIdEncrypted }),
              });
              const { exists: tgExists } = await tgCheckRes.json();
              if (tgExists) {
                form.setError("root", { message: "You already have an account. Please sign in instead." });
                setIsLoading(false);
                return;
              }
            }
          }
        }
      }

      // Create Firebase account with email verification
      await authContext?.signUpWithEmail(data.email, data.password);

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
          const regData = await UseRegisterAndAuth({
            telegramIdEncrypted,
            initDataUnsafe,
            email: data.email,
          });

          if (regData.status === "maintenance") {
            router.replace("/maintenance");
            return;
          }

          if (regData.status === "completed") {
            setTelegramId(regData.telegramId);
            SetMainQuantAmount(regData.MainQuantAmount);
            setRank(regData.rank);
            setUserRank(regData.userRank);
            if (regData.userRank != null) sessionStorage.setItem("userLeaderRank", String(regData.userRank));
            setDaily(regData.daily);
            setUsername(regData.username);
            setWalletAddress(regData.walletAddress);
            setLastActiveTime(regData.lastActiveTime);
            setRemainingSolveToEarn(regData.remainingSolveToEarn);
          }
        }
      }

      // Signal that signup is complete — useEffect handles navigation
      // after auth cookie is confirmed set
      setSignupComplete(true);
    } catch (err) {
      console.error("Sign up error:", err);
      if (err instanceof Error) {
        if (err.message.includes("email-already-in-use")) {
          form.setError("root", { message: "An account with this email already exists" });
        } else if (err.message.includes("invalid-email")) {
          form.setError("root", { message: "Please enter a valid email address" });
        } else if (err.message.includes("weak-password")) {
          form.setError("root", { message: "Password is too weak. Please use a stronger password" });
        } else {
          form.setError("root", { message: "Failed to create account. Please try again." });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramSignUp = async () => {
    setIsLoading(true);
    form.clearErrors("root");
    try {
      if (
        typeof window !== "undefined" &&
        window.Telegram &&
        window.Telegram.WebApp
      ) {
        const WebApp = window.Telegram.WebApp;
        await WebApp.ready();
        console.error(JSON.stringify(WebApp))
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
          form.setError("root", { message: "You already have an account. Please sign in instead." });
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

        // Retry up to 2 more times on error with backoff
        let finalData = data;
        if (data.status === "error") {
          for (let attempt = 1; attempt <= 2; attempt++) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            finalData = await UseRegisterAndAuth({
              telegramIdEncrypted,
              initDataUnsafe,
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
          if (finalData.userRank != null) sessionStorage.setItem("userLeaderRank", String(finalData.userRank));
          setDaily(finalData.daily);
          setUsername(finalData.username);
          setWalletAddress(finalData.walletAddress);
          setLastActiveTime(finalData.lastActiveTime);
          setRemainingSolveToEarn(finalData.remainingSolveToEarn);
          setSignupComplete(true);
        }
      } else {
        form.setError("root", { message: "Telegram WebApp is not available. Please open this app from Telegram." });
      }
    } catch (err) {
      console.error("Telegram sign-up error:", err);
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to sign up with Telegram",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading || signupComplete) {
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

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-6">
              {form.formState.errors.root && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {form.formState.errors.root.message}
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
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="Your email address"
                        disabled={isLoading}
                        autoComplete="email"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <div className="relative">
                        <Input
                          {...field}
                          id={field.name}
                          type={showPassword ? "text" : "password"}
                          aria-invalid={fieldState.invalid}
                          placeholder="Create a password"
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
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                      <div className="relative">
                        <Input
                          {...field}
                          id={field.name}
                          type={showConfirmPassword ? "text" : "password"}
                          aria-invalid={fieldState.invalid}
                          placeholder="Confirm your password"
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
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

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
