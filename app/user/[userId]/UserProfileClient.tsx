"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { useUserProfile } from "@/app/(hooks)/queries/use-user-profile";
import Loader from "@/app/(components)/Loader";
import { toast } from "sonner";

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600", "bg-violet-600", "bg-emerald-600",
    "bg-rose-600", "bg-amber-600", "bg-cyan-600",
    "bg-pink-600", "bg-indigo-600", "bg-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function UserProfileClient() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  // Telegram back button → go back to previous page (the chat)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    const handleBack = () => {
      try { router.back(); } catch { window.history.back(); }
    };
    tg?.BackButton.show();
    tg?.BackButton.onClick(handleBack);
    return () => {
      tg?.BackButton.offClick(handleBack);
      tg?.BackButton.hide();
    };
  }, [router]);

  const { data: profile, isLoading } = useUserProfile(userId);
  const profilePhoto = useProfilePhoto(userId);

  if (isLoading) {
    return <Loader />;
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <Icon icon="solar:user-cross-rounded-bold" className="w-12 h-12 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">User not found</p>
      </div>
    );
  }

  const name = profile.displayName;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 pt-8 space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-3"
        >
          <Avatar className="h-20 w-20 border-2 border-white/10">
            {profilePhoto ? (
              <>
                <AvatarImage src={profilePhoto} alt={name} />
                <AvatarFallback className={`${getAvatarColor(name)} text-white font-bold text-3xl`}>
                  {getInitials(name)}
                </AvatarFallback>
              </>
            ) : (
              <AvatarFallback className={`${getAvatarColor(name)} text-white font-bold text-3xl`}>
                {getInitials(name)}
              </AvatarFallback>
            )}
          </Avatar>

          <h1 className="text-2xl font-bold text-foreground text-center">@{name}</h1>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <button
            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all text-left"
            onClick={() => {
              navigator.clipboard.writeText(userId);
              toast.success("QC ID copied");
            }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon icon="solar:user-id-bold" className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">QC ID</p>
              <p className="font-bold text-white text-sm truncate">{userId}</p>
            </div>
            <Icon icon="solar:copy-linear" className="w-4 h-4 text-white/40 shrink-0" />
          </button>

          {profile.memberSince && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon icon="solar:calendar-bold" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Member Since</p>
                <p className="font-bold text-white text-sm">{profile.memberSince}</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
