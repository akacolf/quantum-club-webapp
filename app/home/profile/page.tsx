"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/(firebase)/client";
import { usernameSchema, linkEmailSchema, USERNAME_MAX_LENGTH } from "@/lib/validations";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { useUserStatsQuery } from "@/app/(hooks)/queries/use-user-stats";
import { useServerAchievementsQuery } from "@/app/(hooks)/queries/use-badges";
import { useQcProfilePhoto } from "@/app/(hooks)/useQcProfilePhoto";
import { useQcUsernameQuery, useRegisterUsernameMutation } from "@/app/(hooks)/queries/use-qc-username";
import { linkEmail } from "@/app/(login)/actions";
import { updateProfilePhotoUrl } from "@/app/ecosystem/chat/actions";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    achievements,
    resolveAchievements,
    RARITY_CONFIG,
    type Achievement,
} from "@/lib/achievements";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { APP_VERSION } from "@/lib/version";

export default function ProfilePage() {
    useTelegramBackButton("/home");
    const authContext = useAuth();
    const { telegramId, username, MainQuantAmount, daily, qcUsername, setQcUsername, walletAddress } = useUserContext();
    const queryClient = useQueryClient();

    // Achievements state
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Queries & Stats
    const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined;
    const photoUrl = useQcProfilePhoto(telegramId);
    const { data: stats, isLoading: statsLoading } = useUserStatsQuery(telegramId, daily || 0);
    const { data: serverAchievements, isLoading: serverLoading } = useServerAchievementsQuery(telegramId ?? null);
    
    // Auth & Linking state
    const currentUser = authContext?.currentUser;
    const hasEmail = !!currentUser?.email;
    const isEmailVerified = currentUser?.emailVerified ?? false;
    const [isLinkingEmail, setIsLinkingEmail] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [emailJustLinked, setEmailJustLinked] = useState(false);

    // QC Username State
    const qcUsernameQuery = useQcUsernameQuery(!qcUsername ? telegramId : null);
    const registerUsernameMutation = useRegisterUsernameMutation();
    const [showUsernameForm, setShowUsernameForm] = useState(false);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailability, setUsernameAvailability] = useState<"available" | "taken" | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Photo Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    useEffect(() => {
      if (qcUsernameQuery.data?.username && !qcUsername) {
        setQcUsername(qcUsernameQuery.data.username);
        if (telegramId) {
          localStorage.setItem(`qcUsername_${telegramId}`, qcUsernameQuery.data.username);
        }
      }
    }, [qcUsernameQuery.data, qcUsername, setQcUsername, telegramId]);

    const resolvedStats = stats ?? { totalQntm: 0, referralCount: 0, tasksCompleted: 0, dailyStreak: 0, walletCreated: false };
    const serverAwardedIds = new Set(serverAchievements?.map((a) => a.achievementId) ?? []);
    const serverEarnedDates = new Map(serverAchievements?.map((a) => [a.achievementId, a.earnedAt]) ?? []);
    const { unlocked, locked } = resolveAchievements(resolvedStats, serverAwardedIds);

    const displayName = qcUsername || username || tgUser?.username || tgUser?.first_name || "Quantum User";

    let initials = "";
    if (displayName && displayName !== "Quantum User") {
        const parts = displayName.split(/[\s_-]+/).filter(Boolean);
        if (parts.length >= 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1) {
            initials = parts[0].substring(0, 2).toUpperCase();
        }
    }

    // ---- Handlers ----
    const handleAchievementClick = (achievement: Achievement) => {
        setSelectedAchievement(achievement);
        setIsSheetOpen(true);
    };

    const isUnlocked = (achievement: Achievement) => unlocked.some((a) => a.id === achievement.id);

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

    const linkEmailForm = useForm({
        defaultValues: { email: "" },
        validators: { onSubmit: linkEmailSchema },
        onSubmit: async () => {
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
        },
    });

    const usernameForm = useForm({
        defaultValues: { username: "" },
        validators: { onSubmit: z.object({ username: usernameSchema }) },
    });

    const checkUsernameAvailability = async () => {
        const currentUsername = usernameForm.getFieldValue("username");
        if (!currentUsername) return;
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
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!file) return;

        if (!qcUsername) {
            toast.error("Claim a QC username first to set a profile photo");
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

    if (statsLoading || serverLoading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-[#111] flex items-center justify-center overflow-hidden">
                            {photoUrl ? (
                                <Image
                                    src={photoUrl}
                                    alt="Profile"
                                    width={112}
                                    height={112}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                />
                            ) : initials ? (
                                <span className="text-4xl font-bold text-neutral-300">
                                    {initials}
                                </span>
                            ) : (
                                <Icon icon="solar:user-bold" className="w-12 h-12 text-muted-foreground" />
                            )}
                        </div>
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
                            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#222] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {isUploadingPhoto ? (
                                <ButtonLoader size="sm" />
                            ) : (
                                <Icon icon="solar:camera-bold" className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    <div className="text-center w-full max-w-xs mx-auto">
                        <h1 className="text-2xl font-bold text-white leading-tight">
                            <span className="text-neutral-400 font-normal">
                                {photoUrl ? "Looking good, " : "Hi, "}
                            </span>
                            {displayName}!
                        </h1>
                        
                        {qcUsername ? (
                            <p className="text-sm text-primary font-medium mt-0.5">@{qcUsername}</p>
                        ) : (
                            <button
                                onClick={() => setShowUsernameForm(!showUsernameForm)}
                                className="text-xs text-neutral-400 hover:text-white transition-colors mt-1.5 flex items-center justify-center gap-1.5 mx-auto bg-[#111] px-3 py-1 rounded-full outline-none focus:outline-none"
                            >
                                <Icon icon="solar:pen-bold" className="w-3.5 h-3.5" />
                                claim your @username
                            </button>
                        )}
                        
                        <button
                            onClick={handleCopyId}
                            className="flex items-center justify-center gap-1.5 mx-auto mt-2 text-xs text-neutral-400 hover:text-white transition-colors outline-none focus:outline-none"
                        >
                            <span className="font-mono">QC ID: {telegramId}</span>
                            <div className="w-3.5 flex items-center justify-center">
                                <Icon
                                    icon={copied ? "solar:check-circle-bold" : "solar:copy-bold"}
                                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${copied ? "text-neutral-200" : ""}`}
                                />
                            </div>
                        </button>
                    </div>

                    {/* Username Creation Form */}
                    {!qcUsername && showUsernameForm && (
                        <Card className="w-full max-w-xs mx-auto bg-[#111] border-none">
                            <CardContent className="p-4 space-y-3">
                                <usernameForm.Field name="username">
                                    {(field) => {
                                        const val = field.state.value;
                                        const hasErrors = field.state.meta.errors.length > 0;
                                        const validationResult = val ? usernameSchema.safeParse(val) : null;
                                        const realtimeError = validationResult && !validationResult.success
                                            ? validationResult.error.issues[0]?.message ?? null
                                            : null;
                                        return (
                                            <>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
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
                                                            className="h-9 text-sm pl-8 font-mono rounded-xl bg-background border-border"
                                                            disabled={registerUsernameMutation.isPending}
                                                        />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-9 text-xs px-3 shrink-0 rounded-xl font-semibold"
                                                        onClick={checkUsernameAvailability}
                                                        disabled={!val || !!realtimeError || isCheckingUsername}
                                                    >
                                                        {isCheckingUsername ? <ButtonLoader size="sm" /> : "Check"}
                                                    </Button>
                                                </div>
                                                {val && realtimeError && (
                                                    <p className="text-[11px] text-destructive px-1">{realtimeError}</p>
                                                )}
                                                {hasErrors && !realtimeError && (
                                                    <FieldError className="text-[11px] px-1" errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                                )}
                                                {usernameAvailability === "available" && (
                                                    <p className="text-[11px] text-green-400 flex items-center gap-1.5 px-1 font-medium">
                                                        <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" />
                                                        @{val} is available!
                                                    </p>
                                                )}
                                                {usernameAvailability === "taken" && (
                                                    <p className="text-[11px] text-destructive flex items-center gap-1.5 px-1 font-medium">
                                                        <Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" />
                                                        @{val} is taken
                                                    </p>
                                                )}
                                                {usernameError && (
                                                    <p className="text-[11px] text-destructive px-1">{usernameError}</p>
                                                )}
                                                {usernameAvailability === "available" && (
                                                    <Button
                                                        className="w-full h-9 rounded-xl font-bold bg-[#222] text-white hover:bg-[#333] mt-2"
                                                        onClick={handleRegisterUsername}
                                                        disabled={registerUsernameMutation.isPending}
                                                    >
                                                        {registerUsernameMutation.isPending ? <ButtonLoader size="sm" /> : `Claim @${val}`}
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    }}
                                </usernameForm.Field>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-[#111] border-none">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:wallet-money-bold" className="w-4 h-4" />
                                Total QNTM
                            </div>
                            <p className="text-xl font-bold text-foreground">{MainQuantAmount || "0"}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#111] border-none">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4" />
                                Referrals
                            </div>
                            <p className="text-xl font-bold text-foreground">{resolvedStats.referralCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#111] border-none">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:checklist-minimalistic-bold" className="w-4 h-4" />
                                Tasks done
                            </div>
                            <p className="text-xl font-bold text-foreground">{resolvedStats.tasksCompleted}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#111] border-none">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                <Icon icon="solar:fire-bold" className="w-4 h-4" />
                                Daily streak
                            </div>
                            <p className="text-xl font-bold text-foreground">{resolvedStats.dailyStreak} day{resolvedStats.dailyStreak !== 1 ? "s" : ""}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Linked Accounts */}
                <div>
                    <Card className="bg-[#111] border-none overflow-hidden">
                        <div className="px-4 py-3 bg-[#111]">
                            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Icon icon="solar:link-bold" className="w-4 h-4 text-white" />
                                Linked accounts
                            </h2>
                        </div>
                        <CardContent className="p-0">
                            <div className="flex items-center gap-3 px-4 py-3.5">
                                <Icon icon="ic:baseline-telegram" className="w-6 h-6 text-[#26A5E4]" />
                                <span className="text-sm font-medium flex-1">Telegram</span>
                                <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-neutral-400" />
                            </div>
                            <div className="flex items-center gap-3 px-4 py-3.5">
                                <Icon icon="solar:letter-bold" className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm font-medium flex-1 truncate">
                                    {hasEmail ? currentUser?.email : "Email"}
                                </span>
                                {hasEmail ? (
                                    isEmailVerified ? (
                                        <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-neutral-400" />
                                    ) : (
                                        <Badge variant="secondary" className="bg-[#222] text-neutral-400 border-0 hover:bg-[#222] flex items-center gap-1">
                                            <Icon icon="solar:clock-circle-bold" className="w-3 h-3" />
                                            Pending
                                        </Badge>
                                    )
                                ) : emailJustLinked ? (
                                    <Badge variant="secondary" className="bg-[#222] text-neutral-400 border-0 hover:bg-[#222] flex items-center gap-1">
                                        <Icon icon="solar:clock-circle-bold" className="w-3 h-3" />
                                        Pending
                                    </Badge>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setShowLinkForm(!showLinkForm)}
                                        className="h-7 text-xs px-3 rounded-full bg-[#222] text-white hover:bg-[#333] border-0 font-semibold"
                                    >
                                        Link email
                                    </Button>
                                )}
                            </div>
                            
                            {/* Email linking form */}
                            {!hasEmail && showLinkForm && (
                                <div className="px-4 pb-4 pt-1">
                                    <div className="p-3 bg-[#111] rounded-xl border-none space-y-3">
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
                                                            className="h-9 text-sm rounded-lg bg-background border-border"
                                                            disabled={isLinkingEmail}
                                                        />
                                                        {hasErrors && <FieldError className="text-[11px] mt-1" errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />}
                                                    </Field>
                                                );
                                            }}
                                        </linkEmailForm.Field>
                                        <Button
                                            size="sm"
                                            className="w-full h-9 rounded-lg font-bold bg-[#222] text-white hover:bg-[#333]"
                                            onClick={() => linkEmailForm.handleSubmit()}
                                            disabled={isLinkingEmail || !linkEmailForm.state.values.email}
                                        >
                                            {isLinkingEmail ? <ButtonLoader size="sm" /> : "Save email"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Achievements Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Icon icon="solar:cup-star-bold" className="w-5 h-5 text-yellow-500" />
                        Achievements
                        <span className="text-sm font-normal text-muted-foreground">
                            ({unlocked.length}/{achievements.length})
                        </span>
                    </h2>

                    <div className="grid grid-cols-3 gap-3">
                        {unlocked.map((achievement) => (
                            <div
                                key={achievement.id}
                                onClick={() => handleAchievementClick(achievement)}
                                className="bg-[#111] border-none rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer active:opacity-80 shadow-sm"
                            >
                                <Icon
                                    icon={achievement.icon}
                                    className={`w-8 h-8 text-white mb-1.5`}
                                />
                                <p className="text-xs font-semibold text-foreground leading-tight">{achievement.name}</p>
                                <p className={`mt-2.5 text-[9px] font-bold ${RARITY_CONFIG[achievement.rarity].bg}`}>
                                    {RARITY_CONFIG[achievement.rarity].label}
                                </p>
                            </div>
                        ))}

                        {locked.map((achievement) => (
                            <div
                                key={achievement.id}
                                onClick={() => handleAchievementClick(achievement)}
                                className="bg-[#111] border-none rounded-2xl p-3 flex flex-col items-center text-center opacity-60 cursor-pointer hover:opacity-80 active:opacity-40 transition-opacity"
                            >
                                <Icon
                                    icon="solar:lock-keyhole-bold"
                                    className="w-8 h-8 text-muted-foreground mb-1.5"
                                />
                                <p className="text-xs font-medium text-muted-foreground leading-tight">{achievement.name}</p>
                                <p className={`mt-2.5 text-[9px] font-bold opacity-50 ${RARITY_CONFIG[achievement.rarity].bg}`}>
                                    {RARITY_CONFIG[achievement.rarity].label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Support & Legal Links */}
                <div className="grid grid-cols-2 gap-3">
                    <a
                        href="https://t.me/QCSupportBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111] border-none hover:bg-[#222] transition-colors group"
                    >
                        <div className="mb-2 flex h-10 w-10 items-center justify-center transition-colors">
                            <Icon icon="solar:headphones-round-sound-bold" className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium">Get support</span>
                    </a>
                    <a
                        href="https://t.me/quantumclubinc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111] border-none hover:bg-[#222] transition-colors group"
                    >
                        <div className="mb-2 flex h-10 w-10 items-center justify-center transition-colors">
                            <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium">Community</span>
                    </a>
                    <Link
                        href="/legal/terms"
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111] border-none hover:bg-[#222] transition-colors group"
                    >
                        <div className="mb-2 flex h-10 w-10 items-center justify-center transition-colors">
                            <Icon icon="solar:document-text-bold" className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium">Terms of service</span>
                    </Link>
                    <Link
                        href="/legal/privacy"
                        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#111] border-none hover:bg-[#222] transition-colors group"
                    >
                        <div className="mb-2 flex h-10 w-10 items-center justify-center transition-colors">
                            <Icon icon="solar:shield-check-bold" className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium">Privacy policy</span>
                    </Link>
                </div>

                <div className="pt-4 pb-2 flex flex-col items-center justify-center gap-1.5">
                    <p className="text-center text-[10px] text-muted-foreground/60 font-medium tracking-wide">
                        Quantum Club {APP_VERSION}
                    </p>
                    <p className="flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground/60 font-medium">
                        Built with <Icon icon="solar:heart-bold" className="w-3 h-3 text-neutral-400" /> and diligence by the QC Team.
                    </p>
                </div>
            </div>

            {/* Achievement Detail Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-[32px] border-none bg-[#0a0a0a]">
                    {selectedAchievement && (
                        <>
                            <SheetHeader className="text-center pb-6">
                                <div className="flex justify-center mb-5">
                                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${isUnlocked(selectedAchievement)
                                        ? "bg-[#111] border-none"
                                        : "bg-[#111] border-none"
                                        }`}>
                                        <Icon
                                            icon={isUnlocked(selectedAchievement)
                                                ? selectedAchievement.icon
                                                : "solar:lock-keyhole-bold"
                                            }
                                            className={`w-12 h-12 ${isUnlocked(selectedAchievement)
                                                ? "text-white"
                                                : "text-muted-foreground"
                                                }`}
                                        />
                                    </div>
                                </div>
                                <SheetTitle className="text-2xl font-bold">
                                    {selectedAchievement.name}
                                </SheetTitle>
                                <SheetDescription className="text-base text-foreground/80 font-medium px-4 mt-2">
                                    {selectedAchievement.description}
                                </SheetDescription>
                                <p className={`mx-auto mt-4 text-xs font-bold ${RARITY_CONFIG[selectedAchievement.rarity].bg}`}>
                                    {RARITY_CONFIG[selectedAchievement.rarity].label}
                                </p>
                            </SheetHeader>

                            <div className="space-y-4 pt-2">
                                {isUnlocked(selectedAchievement) ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-4 bg-[#111] rounded-2xl border-none">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center shadow-sm">
                                                <Icon icon="lucide:check" className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-lg font-bold text-white">Unlocked!</span>
                                        </div>
                                        {selectedAchievement.source === "server" && serverEarnedDates.has(selectedAchievement.id) && (
                                            <p className="text-xs font-medium text-neutral-400">
                                                Earned {serverEarnedDates.get(selectedAchievement.id)!.toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-center mb-6">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border-none rounded-full">
                                                <Icon icon="solar:lock-keyhole-bold" className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-sm font-semibold text-muted-foreground">Locked</span>
                                            </div>
                                        </div>
                                        <Card className="bg-[#111] border-none shadow-sm">
                                            <CardContent className="p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0">
                                                        <Icon icon="solar:lightbulb-bolt-bold" className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground mb-1">How to unlock</p>
                                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">{selectedAchievement.howToUnlock}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
