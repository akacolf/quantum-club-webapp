"use client";

import { useUserContext } from "@/app/(contexts)/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileSidebar from "@/app/(components)/ProfileSidebar";

export default function PersonalizedGreeting() {
  const { username } = useUserContext();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Quantum User");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Get user info from Telegram WebApp directly
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    // Set display name from Telegram or context
    if (tgUser?.username) {
      setDisplayName(tgUser.username);
    } else if (tgUser?.first_name) {
      setDisplayName(tgUser.first_name);
    } else if (username) {
      setDisplayName(username);
    }

    // Get user photo
    if (tgUser?.photo_url) {
      setPhotoUrl(tgUser.photo_url);
    } else if (tgUser?.id) {
      fetch('/api/get-profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tgUser.id })
      })
        .then(res => res.json())
        .then(data => {
          if (data.photoUrl) setPhotoUrl(data.photoUrl);
        })
        .catch(() => { });
    }

    router.prefetch('/home/profile');
  }, [router, username]);

  if (!mounted) return null;

  return (
    <>
      <div className="w-[90%] mx-auto mt-4 mb-2">
        <Card
          className="relative overflow-hidden border-0 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl group cursor-pointer hover:bg-black/80 transition-all duration-300"
          onClick={() => setSidebarOpen(true)}
        >
          {/* Glow Effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />

          <CardContent className="p-3 relative z-10">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Avatar & Info */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar - Simple border, no gradient */}
                <Avatar className="h-11 w-11 border border-[#333]">
                  <AvatarImage src={photoUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">
                    <Icon icon="lucide:user" className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                {/* Text Info */}
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-base truncate pr-1">
                    <span className="text-white">Hi, </span>
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent">{displayName}</span>
                  </h3>
                </div>
              </div>

              {/* Right: Menu Icon */}
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Icon icon="lucide:menu" className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProfileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </>
  );
}