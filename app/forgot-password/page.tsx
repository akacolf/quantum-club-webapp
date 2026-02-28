"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations";
import { sendPasswordResetEmail } from "firebase/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { auth } from "@/app/(firebase)/client";
import { useDeviceDetection } from "@/app/(login)/deviceDetection";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

export default function ForgotPassword() {
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
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

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    form.clearErrors("root");

    try {
      await sendPasswordResetEmail(auth, data.email, {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      });
      setIsEmailSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      if (err instanceof Error) {
        if (err.message.includes("user-not-found")) {
          form.setError("root", { message: "No account found with this email address" });
        } else if (err.message.includes("invalid-email")) {
          form.setError("root", { message: "Please enter a valid email address" });
        } else if (err.message.includes("too-many-requests")) {
          form.setError("root", { message: "Too many requests. Please try again later" });
        } else {
          form.setError("root", { message: "Failed to send reset email. Please try again." });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    form.clearErrors("root");
    try {
      await sendPasswordResetEmail(auth, form.getValues("email"), {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      });
    } catch (err) {
      console.error("Resend error:", err);
      form.setError("root", { message: "Failed to resend email. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
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
            {isEmailSent ? (
              <>
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-green-500/10">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="size-6 text-green-500"
                  />
                </div>
                <h1 className="text-xl font-semibold">Check your email</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{form.getValues("email")}</span>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold">Forgot password?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we&apos;ll send you a link to reset your
                  password
                </p>
              </>
            )}
          </div>

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
                  <ButtonLoader size="sm" />
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
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                {form.formState.errors.root && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Your email address"
                      {...form.register("email")}
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !form.watch("email")}
                  >
                    {isLoading ? (
                      <ButtonLoader size="sm" />
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
        </div>
      </div>
    </div>
  );
}
