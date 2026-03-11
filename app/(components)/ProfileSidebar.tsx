"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { usernameSchema, linkEmailSchema, USERNAME_MAX_LENGTH } from "@/lib/validations";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/app/(contexts)/auth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { linkEmailToUserDoc } from "@/app/(login)/registerAndAuth";
import { toast } from "sonner";
import { APP_VERSION } from "@/lib/version";
import { useQcUsernameQuery, useRegisterUsernameMutation } from "@/app/(hooks)/queries/use-qc-username";

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileSidebar({ open, onOpenChange }: ProfileSidebarProps) {
  const router = useRouter();
  const authContext = useAuth();
  const { telegramId, username, MainQuantAmount, daily, qcUsername, setQcUsername, walletAddress } = useUserContext();

  // Profile photo: prefer Telegram SDK photo_url, fall back to API fetch
  const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;
  const tgPhotoUrl = tgUser?.photo_url ?? null;
  const apiPhotoUrl = useProfilePhoto(!tgPhotoUrl ? telegramId : null);
  const photoUrl = tgPhotoUrl || apiPhotoUrl;

  const displayName = (() => {
    if (username) return username;
    if (tgUser?.username) return tgUser.username;
    if (tgUser?.first_name) return tgUser.first_name;
    return "Quantum User";
  })();

  const [copied, setCopied] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Email linking state
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [emailJustLinked, setEmailJustLinked] = useState(false);

  // Link-email form (TanStack Form)
  const linkEmailForm = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: linkEmailSchema },
    onSubmit: async () => {
      await handleLinkEmail();
    },
  });

  // QC Username state
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<"available" | "taken" | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Username form (TanStack Form)
  const usernameForm = useForm({
    defaultValues: { username: "" },
    validators: { onSubmit: z.object({ username: usernameSchema }) },
  });

  // Load QC username via TanStack Query (replaces inline useEffect+fetch)
  const qcUsernameQuery = useQcUsernameQuery(!qcUsername ? telegramId : null);
  const registerUsernameMutation = useRegisterUsernameMutation();

  useEffect(() => {
    if (qcUsernameQuery.data?.username && !qcUsername) {
      setQcUsername(qcUsernameQuery.data.username);
      if (telegramId) {
        localStorage.setItem(`qcUsername_${telegramId}`, qcUsernameQuery.data.username);
      }
    }
  }, [qcUsernameQuery.data, qcUsername, setQcUsername, telegramId]);

  const handleCopyId = async () => {
    if (!telegramId) return;
    try {
      await navigator.clipboard.writeText(telegramId);
      setCopied(true);
      toast.success("QC ID copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy ID");
    }
  };

  const checkUsernameAvailability = async () => {
    const currentUsername = usernameForm.getFieldValue("username");
    if (!currentUsername) return;
    // Validate via schema before checking availability
    const result = usernameSchema.safeParse(currentUsername);
    if (!result.success) return;
    setIsCheckingUsername(true);
    setUsernameAvailability(null);
    setUsernameError(null);
    try {
      const { resolveQcUsername } = await import("@/app/ecosystem/chat/actions");
      const result = await resolveQcUsername({ username: currentUsername });
      setUsernameAvailability(result?.data?.available ? "available" : "taken");
    } catch {
      setUsernameError("Failed to check");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRegisterUsername = async () => {
    const currentUsername = usernameForm.getFieldValue("username");
    if (!currentUsername || !telegramId || usernameAvailability !== "available") return;
    registerUsernameMutation.mutate(
      { username: currentUsername, address: walletAddress || undefined },
      {
        onSuccess: () => {
          setQcUsername(currentUsername);
          localStorage.setItem(`qcUsername_${telegramId}`, currentUsername);
          toast.success(`You're now @${currentUsername}!`);
          setShowUsernameForm(false);
          usernameForm.reset();
          setUsernameAvailability(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to register username");
        },
      }
    );
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Clear keepLoggedIn so user sees auth page on next visit
      authContext?.setKeepLoggedIn(false);
      await authContext?.logout();
      onOpenChange(false);
      router.replace("/");
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  const navigateTo = (path: Parameters<typeof router.push>[0]) => {
    onOpenChange(false);
    router.push(path);
  };

  const handleLinkEmail = async () => {
    const { email, password } = linkEmailForm.state.values;
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsLinkingEmail(true);
    try {
      await authContext?.linkEmailToAccount(email, password);
      // Store email in Firestore user doc
      if (telegramId) {
        await linkEmailToUserDoc(telegramId, email);
      }
      toast.success("Email linked! Verification pending.");
      linkEmailForm.reset();
      setShowLinkForm(false);
      setEmailJustLinked(true);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("email-already-in-use")) {
          toast.error("This email is already linked to another account");
        } else if (err.message.includes("provider-already-linked")) {
          toast.error("An email is already linked to this account");
        } else if (err.message.includes("invalid-email")) {
          toast.error("Please enter a valid email address");
        } else if (err.message.includes("weak-password")) {
          toast.error("Password is too weak");
        } else {
          toast.error("Failed to link email. Please try again.");
        }
      }
    } finally {
      setIsLinkingEmail(false);
    }
  };

  // Auth binding info
  const currentUser = authContext?.currentUser;
  const hasEmail = !!currentUser?.email;
  const isEmailVerified = currentUser?.emailVerified ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[300px] bg-background border-border p-0 flex flex-col overflow-y-auto"
        style={{
          paddingTop: `max(env(safe-area-inset-top, 0px), var(--tg-content-safe-area-inset-top, 16px))`,
        }}
      >
        <SheetHeader className="px-6 pt-4 pb-3">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={photoUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-card text-muted-foreground">
                <Icon icon="solar:user-bold" className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <SheetTitle className="text-lg">{displayName}</SheetTitle>
              {qcUsername ? (
                <>
                  <p className="text-sm text-primary font-medium mt-0.5">@{qcUsername}</p>
                </>
              ) : (
                <button
                  onClick={() => setShowUsernameForm(!showUsernameForm)}
                  className="text-[10px] text-primary/70 hover:text-primary transition-colors mt-1 flex items-center gap-1 mx-auto outline-none focus:outline-none focus-visible:outline-none"
                >
                  <Icon icon="solar:pen-bold" className="w-3 h-3" />
                  Claim your @username
                </button>
              )}
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 mx-auto mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors outline-none focus:outline-none focus-visible:outline-none"
              >
                <span className="font-mono text-muted-foreground">QC ID: {telegramId?.slice(0, 8)}...</span>
                <Icon
                  icon={copied ? "solar:check-circle-bold" : "solar:copy-bold"}
                  className={`w-3 h-3 ${copied ? "text-green-400" : ""}`}
                />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Username Creation Form (inline) */}
        {!qcUsername && showUsernameForm && (
          <div className="px-5 py-3 space-y-2">
            <usernameForm.Field name="username">
              {(field) => {
                const val = field.state.value;
                const hasErrors = field.state.meta.errors.length > 0;
                // Inline validation for real-time feedback (schema validates on submit)
                const validationResult = val ? usernameSchema.safeParse(val) : null;
                const realtimeError = validationResult && !validationResult.success
                  ? validationResult.error.issues[0]?.message ?? null
                  : null;
                return (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">@</span>
                        <Input
                          placeholder="username"
                          value={val}
                          onChange={(e) => {
                            const filtered = e.target.value.replace(/[^a-zA-Z0-9._-]/g, "");
                            field.handleChange(filtered);
                            setUsernameAvailability(null);
                            setUsernameError(null);
                          }}
                          onBlur={field.handleBlur}
                          maxLength={USERNAME_MAX_LENGTH}
                          className="h-8 text-xs pl-7 font-mono rounded-full"
                          disabled={registerUsernameMutation.isPending}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[10px] px-2.5 shrink-0 rounded-full"
                        onClick={checkUsernameAvailability}
                        disabled={!val || !!realtimeError || isCheckingUsername}
                      >
                        {isCheckingUsername ? <ButtonLoader size="sm" /> : "Check"}
                      </Button>
                    </div>
                    {/* Validation / availability feedback */}
                    {val && realtimeError && (
                      <p className="text-[10px] text-destructive">{realtimeError}</p>
                    )}
                    {hasErrors && !realtimeError && (
                      <FieldError className="text-[10px]" errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />
                    )}
                    {usernameAvailability === "available" && (
                      <p className="text-[10px] text-green-400 flex items-center gap-1">
                        <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                        @{val} is available!
                      </p>
                    )}
                    {usernameAvailability === "taken" && (
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                        @{val} is taken
                      </p>
                    )}
                    {usernameError && (
                      <p className="text-[10px] text-destructive">{usernameError}</p>
                    )}
                    {usernameAvailability === "available" && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          Your username will be <span className="text-foreground font-medium">@{val}</span>
                        </p>
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={handleRegisterUsername}
                          disabled={registerUsernameMutation.isPending}
                        >
                          {registerUsernameMutation.isPending ? <ButtonLoader size="sm" /> : `Claim @${val}`}
                        </Button>
                      </div>
                    )}
                  </>
                );
              }}
            </usernameForm.Field>
          </div>
        )}

        <Separator />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          <Card className="bg-card/80">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{MainQuantAmount || "0"}</p>
              <p className="text-[10px] text-muted-foreground">QNTM</p>
            </CardContent>
          </Card>
          <Card className="bg-card/80">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{daily || 0}</p>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-1">
          <button
            onClick={() => navigateTo("/home/profile")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:user-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Profile & Achievements</span>
          </button>

          <Separator className="my-2" />

          {/* Auth Binding Section */}
          <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Linked Accounts
          </p>
          <div className="px-4 py-2 space-y-2">
            {/* Telegram — always linked */}
            <div className="flex items-center gap-3 py-1.5">
              <Icon icon="ic:baseline-telegram" className="w-5 h-5 text-[#26A5E4]" />
              <span className="text-sm flex-1">Telegram</span>
              <span className="text-[10px] text-green-400 font-medium">Connected</span>
            </div>
            {/* Email */}
            <div className="flex items-center gap-3 py-1.5">
              <Icon icon="solar:letter-bold" className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">
                {hasEmail ? currentUser?.email : "Email"}
              </span>
              {hasEmail ? (
                isEmailVerified ? (
                  <span className="text-[10px] text-green-400 font-medium">Verified</span>
                ) : (
                  <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                    <Icon icon="solar:clock-circle-bold" className="w-3 h-3" />
                    Pending
                  </span>
                )
              ) : emailJustLinked ? (
                <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                  <Icon icon="solar:clock-circle-bold" className="w-3 h-3" />
                  Pending
                </span>
              ) : (
                <button
                  onClick={() => setShowLinkForm(!showLinkForm)}
                  className="text-[10px] text-primary font-medium hover:underline"
                >
                  Link
                </button>
              )}
            </div>
            {/* Email linking form */}
            {!hasEmail && showLinkForm && (
              <div className="space-y-2 py-2 px-1">
                <linkEmailForm.Field name="email">
                  {(field) => {
                    const hasErrors = field.state.meta.errors.length > 0;
                    return (
                      <Field>
                        <Input
                          type="email"
                          placeholder="Your email address"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="h-8 text-xs"
                          disabled={isLinkingEmail}
                        />
                        {hasErrors && <FieldError className="text-[10px]" errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                      </Field>
                    );
                  }}
                </linkEmailForm.Field>
                <linkEmailForm.Field name="password">
                  {(field) => {
                    const hasErrors = field.state.meta.errors.length > 0;
                    return (
                      <Field>
                        <Input
                          type="password"
                          placeholder="Create a password"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="h-8 text-xs"
                          disabled={isLinkingEmail}
                        />
                        {hasErrors && <FieldError className="text-[10px]" errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                      </Field>
                    );
                  }}
                </linkEmailForm.Field>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => linkEmailForm.handleSubmit()}
                  disabled={isLinkingEmail || !linkEmailForm.state.values.email || !linkEmailForm.state.values.password}
                >
                  {isLinkingEmail ? (
                    <ButtonLoader size="sm" />
                  ) : (
                    "Link Email"
                  )}
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          <a
            href="https://t.me/QCSupportBot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:headphones-round-sound-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Get Support</span>
            <Icon icon="solar:arrow-right-up-linear" className="w-4 h-4 text-muted-foreground ml-auto" />
          </a>
          <a
            href="https://t.me/quantumclubinc"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Community</span>
            <Icon icon="solar:arrow-right-up-linear" className="w-4 h-4 text-muted-foreground ml-auto" />
          </a>

          <Separator className="my-2" />

          <Link
            href="/legal/terms"
            onClick={() => onOpenChange(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:document-text-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Terms of Service</span>
          </Link>
          <Link
            href="/legal/privacy"
            onClick={() => onOpenChange(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:shield-check-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Privacy Policy</span>
          </Link>
        </nav>

        {/* Footer: Sign Out + Version */}
        <div className="p-4 pt-2 space-y-2 shrink-0">
          <Separator />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <Icon icon="solar:logout-2-bold" className="w-5 h-5" />
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground/50">
            Quantum Club v{APP_VERSION}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
