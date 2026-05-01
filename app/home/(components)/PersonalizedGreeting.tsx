"use client";

import { useUserContext } from "@/app/(contexts)/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useQcProfilePhoto } from "@/app/(hooks)/useQcProfilePhoto";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function PersonalizedGreeting() {
  const { username, qcUsername, telegramId } = useUserContext();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const photoUrl = useQcProfilePhoto(telegramId);

  const tgUser = mounted ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  // Priority: qcUsername → tg username → tg first_name → fallback
  const displayName = qcUsername || username || tgUser?.username || tgUser?.first_name || "Quantum User";

  // Generate initials from the best available name
  const initials = (() => {
    if (!displayName || displayName === "Quantum User") return "";
    const parts = displayName.split(/[\s_-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return "";
  })();

  if (!mounted) return null;

  return (
    <div className="w-[90%] mx-auto mb-4 flex justify-end">
      <Link href="/home/profile">
        <Avatar className="h-11 w-11 cursor-pointer hover:opacity-80 transition-opacity">
          <AvatarImage src={photoUrl || undefined} alt={displayName} />
          <AvatarFallback className="bg-[#111] text-neutral-300 text-sm font-semibold border-none flex items-center justify-center">
            {initials || <Icon icon="solar:user-bold" className="w-5 h-5 text-neutral-500" />}
          </AvatarFallback>
        </Avatar>
      </Link>
    </div>
  );
}
