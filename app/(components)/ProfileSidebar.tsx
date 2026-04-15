"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/(firebase)/client";
import { usernameSchema, linkEmailSchema, USERNAME_MAX_LENGTH } from "@/lib/validations";
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
import { linkEmail } from "@/app/(login)/actions";
import { updateProfilePhotoUrl } from "@/app/ecosystem/chat/actions";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
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

  // Keep tgUser around only for name resolution (display name when no QC
  // username is claimed yet). Profile photos come from the QC pp uploaded
  // to qcUsernames — no Telegram photo fallback.
  const [tgUser, setTgUser] = useState<{ username?: string; first_name?: string } | null>(null);
  useEffect(() => {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u) setTgUser({ username: u.username ?? undefined, first_name: u.first_name });
  }, []);

  // Always-on photo query (separate from the username-resolution query below,
  // which is conditional on !qcUsername). TanStack Query dedupes under the
  // same cache key so this doesn't cause duplicate network calls.
  const photoQuery = useQcUsernameQuery(telegramId);
  const photoUrl = photoQuery.data?.profilePhotoUrl ?? null;

  const displayName = (() => {
    if (username) return username;
    if (tgUser?.username) return tgUser.username;
    if (tgUser?.first_name) return tgUser.first_name;
    return "Quantum User";
  })();

  const [copied, setCopied] = useState(false);

  // Email linking state
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [emailJustLinked, setEmailJustLinked] = useState(false);

  // Link-email form (TanStack Form). Email-only — no password.
  // We collect the email as a contact field stored in the user's Firestore
  // doc (for future native-platform contact), not as a Firebase Auth credential.
  const linkEmailForm = useForm({
    defaultValues: { email: "" },
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
          haptics.success();
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

  const navigateTo = (path: Parameters<typeof router.push>[0]) => {
    onOpenChange(false);
    router.push(path);
  };

  const handleLinkEmail = async () => {
    const { email } = linkEmailForm.state.values;
    if (!email) {
      toast.error("Please enter an email");
      return;
    }
    setIsLinkingEmail(true);
    try {
      const result = await linkEmail({ email });
      if (result?.serverError || result?.validationErrors) {
        toast.error("Failed to save email. Please try again.");
        return;
      }
      haptics.success();
      toast.success("Email saved");
      linkEmailForm.reset();
      setShowLinkForm(false);
      setEmailJustLinked(true);
    } catch {
      toast.error("Failed to save email. Please try again.");
    } finally {
      setIsLinkingEmail(false);
    }
  };

  // Auth binding info
  const currentUser = authContext?.currentUser;
  const hasEmail = !!currentUser?.email;
  const isEmailVerified = currentUser?.emailVerified ?? false;

  // Profile photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Resize an image File to a square JPEG via canvas (no external deps).
   * Keeps the photo well under the 2MB storage rule cap and normalizes
   * all uploaded avatars to 512x512 center-cropped.
   */
  async function resizeToSquareJpeg(file: File, size = 512, quality = 0.85): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const min = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - min) / 2;
    const sy = (bitmap.height - min) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size);
    bitmap.close();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
        "image/jpeg",
        quality,
      );
    });
  }

  async function handleProfilePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file twice still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!qcUsername) {
      toast.error("Claim a QC username first");
      return;
    }
    if (!telegramId) {
      toast.error("Still connecting — try again in a moment");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const resized = await resizeToSquareJpeg(file);
      const path = `profile-photos/${telegramId}/${Date.now()}.jpg`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, resized, { contentType: "image/jpeg" });
      const url = await getDownloadURL(ref);

      const result = await updateProfilePhotoUrl({ url });
      if (result?.serverError || !result?.data?.success) {
        throw new Error(result?.serverError || "Failed to save photo");
      }

      // Invalidate all qcUsername-by-id caches so every avatar that reads
      // from useQcProfilePhoto refreshes to the new URL.
      queryClient.invalidateQueries({ queryKey: ["qc-username", "by-id"] });
      haptics.success();
      toast.success("Profile photo updated");
    } catch (err) {
      console.error("Profile photo upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

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
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={photoUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-card text-muted-foreground">
                  <Icon icon="solar:user-bold" className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoSelected}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto || !qcUsername}
                aria-label="Change profile photo"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingPhoto ? (
                  <ButtonLoader size="sm" />
                ) : (
                  <Icon icon="solar:camera-bold" className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
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
                      <FieldError className="text-[10px]" errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
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
                        {hasErrors && <FieldError className="text-[10px]" errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />}
                      </Field>
                    );
                  }}
                </linkEmailForm.Field>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => linkEmailForm.handleSubmit()}
                  disabled={isLinkingEmail || !linkEmailForm.state.values.email}
                >
                  {isLinkingEmail ? (
                    <ButtonLoader size="sm" />
                  ) : (
                    "Save Email"
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

        {/* Footer: Version */}
        <div className="p-4 pt-2 space-y-2 shrink-0">
          <Separator />
          <p className="text-center text-[10px] text-muted-foreground/50">
            Quantum Club v{APP_VERSION}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
