"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { sendPasswordResetEmail } from "firebase/auth";
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
import { useDeviceDetection } from "@/app/(login)/deviceDetection";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const router = useRouter();

  // Enable fullscreen mode for Telegram Mini App
  useDeviceDetection();
  
  // Telegram back button to return to login
  useTelegramBackButton("/");

  useEffect(() => {
    // Prefetch login page for faster navigation
    router.prefetch("/");
    
    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      });
      setIsEmailSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      if (err instanceof Error) {
        if (err.message.includes("user-not-found")) {
          setError("No account found with this email address");
        } else if (err.message.includes("invalid-email")) {
          setError("Please enter a valid email address");
        } else if (err.message.includes("too-many-requests")) {
          setError("Too many requests. Please try again later");
        } else {
          setError("Failed to send reset email. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      });
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend email. Please try again.");
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
              {isEmailSent ? (
                <>
                  <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-500/10">
                    <Icon
                      icon="solar:check-circle-bold"
                      className="size-6 text-green-500"
                    />
                  </div>
                  <CardTitle className="text-xl">Check your email</CardTitle>
                  <CardDescription>
                    We&apos;ve sent a password reset link to{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-xl">Forgot password?</CardTitle>
                  <CardDescription>
                    Enter your email and we&apos;ll send you a link to reset your
                    password
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              {isEmailSent ? (
                <div className="grid gap-6">
                  <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
                    <p className="mb-2">
                      <Icon
                        icon="solar:info-circle-linear"
                        className="inline-block size-4 mr-1"
                      />
                      Didn&apos;t receive the email?
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Check your spam or junk folder</li>
                      <li>Make sure you entered the correct email</li>
                      <li>Wait a few minutes for the email to arrive</li>
                    </ul>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendEmail}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Icon
                        icon="svg-spinners:ring-resize"
                        className="size-5"
                      />
                    ) : (
                      <>
                        <Icon icon="solar:refresh-linear" className="size-5" />
                        Resend email
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => router.push("/")}
                  >
                    <Icon icon="solar:arrow-left-linear" className="size-5" />
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-6">
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="grid gap-4">
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
                          autoFocus
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || !email}
                      >
                        {isLoading ? (
                          <Icon
                            icon="svg-spinners:ring-resize"
                            className="size-5"
                          />
                        ) : (
                          <>
                            <Icon icon="solar:letter-linear" className="size-5" />
                            Send reset link
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      Remember your password?{" "}
                      <Link
                        href="/"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Sign in
                      </Link>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
