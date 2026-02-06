"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement email/password authentication
    console.log("Login with:", { email, password });
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // TODO: Implement Google authentication
    console.log("Login with Google");
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    // TODO: Implement Telegram authentication
    console.log("Login with Telegram");
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6")}>
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary">
                <Icon
                  icon="solar:wallet-bold"
                  className="size-6 text-primary-foreground"
                />
              </div>
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Login to your Quantum Club account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                    >
                      <Icon icon="flat-color-icons:google" className="size-5" />
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleTelegramLogin}
                      disabled={isLoading}
                    >
                      <Icon
                        icon="logos:telegram"
                        className="size-5"
                      />
                      Continue with Telegram
                    </Button>
                  </div>

                  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-card px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>

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
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <a
                          href="#"
                          className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                          Forgot password?
                        </a>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
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
                            icon={showPassword ? "solar:eye-closed-linear" : "solar:eye-linear"}
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
                        "Sign In"
                      )}
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <a
                      href="#"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Sign up
                    </a>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-balance text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
