"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileSidebar({ open, onOpenChange }: ProfileSidebarProps) {
  const router = useRouter();
  const authContext = useAuth();
  const { telegramId, username, MainQuantAmount, daily } = useUserContext();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Quantum User");
  const [copied, setCopied] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Email linking state
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.username) {
      setDisplayName(tgUser.username);
    } else if (tgUser?.first_name) {
      setDisplayName(tgUser.first_name);
    } else if (username) {
      setDisplayName(username);
    }

    if (tgUser?.photo_url) {
      setPhotoUrl(tgUser.photo_url);
    } else if (tgUser?.id) {
      fetch("/api/get-profile-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: tgUser.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.photoUrl) setPhotoUrl(data.photoUrl);
        })
        .catch(() => {});
    }
  }, [username]);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
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
      toast.success("Email linked successfully! Verification email sent.");
      setLinkEmail("");
      setLinkPassword("");
      setShowLinkForm(false);
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

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      await authContext?.linkGoogleToAccount();
      toast.success("Google account linked successfully!");
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("credential-already-in-use")) {
          toast.error("This Google account is already linked to another account");
        } else if (err.message.includes("provider-already-linked")) {
          toast.error("A Google account is already linked");
        } else {
          toast.error("Failed to link Google account. Please try again.");
        }
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  // Auth binding info
  const currentUser = authContext?.currentUser;
  const hasEmail = !!currentUser?.email;
  const hasGoogle = currentUser?.providerData?.some(p => p.providerId === "google.com");

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
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 mx-auto mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="font-mono">QC ID: {telegramId?.slice(0, 8)}...</span>
                <Icon
                  icon={copied ? "solar:check-circle-bold" : "solar:copy-bold"}
                  className={`w-3 h-3 ${copied ? "text-green-400" : ""}`}
                />
              </button>
            </div>
          </div>
        </SheetHeader>

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
          <button
            onClick={() => navigateTo("/wallet/settings")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:wallet-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Wallet Settings</span>
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
                <span className="text-[10px] text-green-400 font-medium">Linked</span>
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
                    <Icon icon="svg-spinners:ring-resize" className="size-4" />
                  ) : (
                    "Link Email"
                  )}
                </Button>
              </div>
            )}
            {/* Google */}
            <div className="flex items-center gap-3 py-1.5">
              <Icon icon="flat-color-icons:google" className="w-5 h-5" />
              <span className="text-sm flex-1">Google</span>
              {hasGoogle ? (
                <span className="text-[10px] text-green-400 font-medium">Linked</span>
              ) : (
                <button
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle}
                  className="text-[10px] text-primary font-medium hover:underline disabled:opacity-50"
                >
                  {isLinkingGoogle ? "Linking..." : "Link"}
                </button>
              )}
            </div>
          </div>

          <Separator className="my-2" />

          <button
            onClick={() => navigateTo("/wallet/settings/terms")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:file-text-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Terms of Service</span>
          </button>
          <button
            onClick={() => navigateTo("/wallet/settings/privacy")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <Icon icon="solar:shield-bold" className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">Privacy Policy</span>
          </button>

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
