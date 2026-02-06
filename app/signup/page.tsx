"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from "firebase/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/app/(firebase)/client";
import { useAuth } from "@/app/(contexts)/auth";
import { authenticateUser } from "@/lib/telegramAuth";
import { encryptData } from "@/app/actions/actions";
import { UseRegisterAndAuth } from "@/app/(login)/registerAndAuth";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import Loader from "@/app/(components)/Loader";

export default function SignUp() {
  const [name, setName] = useState("");
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
  } = useGameContext();
  const { setUserRank } = useLeaderboardContext();

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        router.replace("/home");
      }
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

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        router.replace("/home");
      }
    } catch (err) {
      console.error("Google sign-up error:", err);
      setError("Failed to sign up with Google. Please try again.");
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
        const initDataUnsafe = WebApp.initDataUnsafe;

        const authenticated = await authenticateUser();
        if (authenticated) {
          const encryptedId = await encryptData(
            initDataUnsafe.user?.id.toString() || ""
          );
          if (!encryptedId) {
            throw new Error("Failed to encrypt Telegram ID");
          }

          const cleanData = encryptedId.toString();
          const telegramIdEncrypted = cleanData
            .replace(/['"]+/g, "")
            .replace(/[^a-zA-Z0-9]/g, "");
          const uid = String(telegramIdEncrypted);

          const responseAuth = await fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId: uid }),
          });

          if (!responseAuth.ok) {
            const errorData = await responseAuth.text();
            throw new Error(`API Error: ${responseAuth.status} - ${errorData}`);
          }

          const { customToken } = await responseAuth.json();
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
            setDaily(data.daily);
            setUsername(data.username);
            setWalletAddress(data.walletAddress);
            setLastActiveTime(data.lastActiveTime);
            setRemainingSolveToEarn(data.remainingSolveToEarn);
            router.replace("/home");
          }
        } else {
          throw new Error("Telegram authentication failed");
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
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6")}>
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
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
              <CardTitle className="text-xl">Create an account</CardTitle>
              <CardDescription>
                Sign up to get started with Quantum Club
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      onClick={handleGoogleSignUp}
                      disabled={isLoading}
                    >
                      <Icon icon="flat-color-icons:google" className="size-5" />
                      Continue with Google
                    </Button>
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
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Icon
                          icon="svg-spinners:ring-resize"
                          className="size-5"
                        />
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
            </CardContent>
          </Card>

          <p className="text-balance text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              href="/wallet/settings/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/wallet/settings/privacy"
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
