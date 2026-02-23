"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Input } from "@/components/ui/input";
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
import { useUserBadgesQuery } from "@/app/(hooks)/queries/use-badges";
import { getBadgeDefinition } from "@/lib/badges";

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileSidebar({ open, onOpenChange }: ProfileSidebarProps) {
  const router = useRouter();
  const authContext = useAuth();
  const { telegramId, username, MainQuantAmount, daily, qcUsername, setQcUsername, walletAddress } = useUserContext();

  const badgesQuery = useUserBadgesQuery(telegramId);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Quantum User");
  const [copied, setCopied] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Email linking state
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [emailJustLinked, setEmailJustLinked] = useState(false);

  // QC Username state
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isRegisteringUsername, setIsRegisteringUsername] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<"available" | "taken" | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    // Prefer DB-stored username (works for email login from different TG account)
    if (username) {
      setDisplayName(username);
    } else {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.username) {
        setDisplayName(tgUser.username);
      } else if (tgUser?.first_name) {
        setDisplayName(tgUser.first_name);
      }
    }

    // Fetch profile photo using DB telegramId (not initDataUnsafe which may be a different TG account)
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.photo_url) {
      setPhotoUrl(tgUser.photo_url);
    } else if (telegramId) {
      fetch("/api/get-profile-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.photoUrl) setPhotoUrl(data.photoUrl);
        })
        .catch(() => {});
    }
  }, [username, telegramId]);

  // Load QC username on mount
  useEffect(() => {
    if (!telegramId || qcUsername) return;
    const loadUsername = async () => {
      try {
        const res = await fetch(`/api/qc-username?qcId=${encodeURIComponent(telegramId)}`);
        const data = await res.json();
        if (data.username) {
          setQcUsername(data.username);
          localStorage.setItem(`qcUsername_${telegramId}`, data.username);
        }
      } catch {
        // No username yet
      }
    };
    loadUsername();
  }, [telegramId, qcUsername, setQcUsername]);

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

  // Username validation
  const USERNAME_MIN = 3;
  const USERNAME_MAX = 20;
  const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/;
  const validateUsername = (val: string): string | null => {
    if (!val) return null;
    if (val.length < USERNAME_MIN) return `Min ${USERNAME_MIN} characters`;
    if (val.length > USERNAME_MAX) return `Max ${USERNAME_MAX} characters`;
    if (!USERNAME_REGEX.test(val)) return "Letters, numbers, dots, underscores & hyphens only";
    return null;
  };

  const checkUsernameAvailability = async () => {
    if (!newUsername || validateUsername(newUsername)) return;
    setIsCheckingUsername(true);
    setUsernameAvailability(null);
    setUsernameError(null);
    try {
      const res = await fetch(`/api/qc-username?username=${encodeURIComponent(newUsername)}`);
      const data = await res.json();
      setUsernameAvailability(data.available ? "available" : "taken");
    } catch {
      setUsernameError("Failed to check");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRegisterUsername = async () => {
    if (!newUsername || !telegramId || usernameAvailability !== "available") return;
    setIsRegisteringUsername(true);
    try {
      const res = await fetch("/api/qc-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          qcId: telegramId,
          address: walletAddress || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setQcUsername(newUsername);
        localStorage.setItem(`qcUsername_${telegramId}`, newUsername);
        toast.success(`You're now @${newUsername}!`);
        setShowUsernameForm(false);
        setNewUsername("");
        setUsernameAvailability(null);
      } else {
        toast.error(data.error || "Failed to register username");
      }
    } catch {
      toast.error("Failed to register username");
    } finally {
      setIsRegisteringUsername(false);
    }
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

  const navigateTo = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const handleLinkEmail = async () => {
    if (!linkEmail || !linkPassword) {
      toast.error("Please enter email and password");
      return;
    }
    if (linkPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsLinkingEmail(true);
    try {
      await authContext?.linkEmailToAccount(linkEmail, linkPassword);
      // Store email in Firestore user doc
      if (telegramId) {
        await linkEmailToUserDoc(telegramId, linkEmail);
      }
      toast.success("Email linked! Verification pending.");
      setLinkEmail("");
      setLinkPassword("");
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">@</span>
                <Input
                  placeholder="username"
                  value={newUsername}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9._-]/g, "");
                    setNewUsername(val);
                    setUsernameAvailability(null);
                    setUsernameError(null);
                  }}
                  maxLength={USERNAME_MAX}
                  className="h-8 text-xs pl-7 font-mono rounded-full"
                  disabled={isRegisteringUsername}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[10px] px-2.5 shrink-0 rounded-full"
                onClick={checkUsernameAvailability}
                disabled={!newUsername || !!validateUsername(newUsername) || isCheckingUsername}
              >
                {isCheckingUsername ? <ButtonLoader size="sm" /> : "Check"}
              </Button>
            </div>
            {/* Validation / availability feedback */}
            {newUsername && validateUsername(newUsername) && (
              <p className="text-[10px] text-destructive">{validateUsername(newUsername)}</p>
            )}
            {usernameAvailability === "available" && (
              <p className="text-[10px] text-green-400 flex items-center gap-1">
                <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                @{newUsername} is available!
              </p>
            )}
            {usernameAvailability === "taken" && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                @{newUsername} is taken
              </p>
            )}
            {usernameError && (
              <p className="text-[10px] text-destructive">{usernameError}</p>
            )}
            {usernameAvailability === "available" && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Your username will be <span className="text-foreground font-medium">@{newUsername}</span>
                </p>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleRegisterUsername}
                  disabled={isRegisteringUsername}
                >
                  {isRegisteringUsername ? <ButtonLoader size="sm" /> : `Claim @${newUsername}`}
                </Button>
              </div>
            )}
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

        {/* Badges Section */}
        {(badgesQuery.data?.length ?? 0) > 0 && (
          <>
            <div className="px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Badges</p>
                <button
                  onClick={() => navigateTo("/badges")}
                  className="text-[10px] text-primary hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {badgesQuery.data!.slice(0, 4).map((ub) => {
                  const def = getBadgeDefinition(ub.badgeId);
                  if (!def) return null;
                  return (
                    <div
                      key={ub.badgeId}
                      className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-1"
                    >
                      <Icon icon={def.icon} className={`w-3 h-3 ${def.color}`} />
                      <span className="text-[10px] font-medium">{def.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

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
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  className="h-8 text-xs"
                  disabled={isLinkingEmail}
                />
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  className="h-8 text-xs"
                  disabled={isLinkingEmail}
                />
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleLinkEmail}
                  disabled={isLinkingEmail || !linkEmail || !linkPassword}
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

          <button
            onClick={() => { onOpenChange(false); router.push("/legal/terms"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:document-text-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Terms of Service</span>
          </button>
          <button
            onClick={() => { onOpenChange(false); router.push("/legal/privacy"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:shield-check-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Privacy Policy</span>
          </button>
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
