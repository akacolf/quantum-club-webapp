"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc } from "firebase/firestore";
import Loader from "@/app/(components)/Loader";

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

function parseCreatedAt(userArray: string | undefined): string | null {
  if (!userArray) return null;
  const match = userArray.match(/createdAt=([^&]+)/);
  return match ? match[1] : null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  useTelegramBackButton();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const profilePhoto = useProfilePhoto(userId);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function fetchUser() {
      try {
        const userDoc = await getDoc(doc(dbfs, "user", userId));
        if (cancelled) return;

        if (!userDoc.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = userDoc.data();
        setDisplayName(data.qcUsername || data.username || "Quantum User");

        const createdAt = parseCreatedAt(data.userArray);
        if (createdAt) {
          const date = new Date(createdAt);
          setMemberSince(
            date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          );
        }

        setLoading(false);
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <Loader />;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const name = displayName || "Quantum User";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 pt-8 space-y-6">
        {/* Back Button (web fallback) */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4" />
          Back
        </button>

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
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon icon="solar:user-id-bold" className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">QC ID</p>
              <p className="font-bold text-white text-sm">{userId}</p>
            </div>
          </div>

          {memberSince && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon icon="solar:calendar-bold" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Member Since</p>
                <p className="font-bold text-white text-sm">{memberSince}</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
