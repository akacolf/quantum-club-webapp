"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useFrenContext } from "@/app/(contexts)/FrensContext";

import { useUserContext } from "@/app/(contexts)/UserContext";
import { useFrensDataQuery } from "@/app/(hooks)/queries/use-frens-data";
import { useReferralListQuery } from "@/app/(hooks)/queries/use-referral-list";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import InvitePopup from "./(components)/InvitePopup";
import handshakeAnimationData from "@/public/lottie/handshake-lottie.json";
import dynamic from "next/dynamic";
import type { LottieRefCurrentProps } from "lottie-react";
import { Skeleton } from "@/components/ui/skeleton";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <Skeleton className="w-12 h-12 rounded-lg" />,
});
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import Image from "next/image";
import { useQcProfilePhotosBatch } from "@/app/(hooks)/useQcProfilePhoto";
import { claimTier2Rewards, claimReferralTon } from "./actions";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const FrensContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const { referralsNum, setReferralNum } = useFrenContext();
  const { telegramId, username, SetMainQuantAmount } = useUserContext();
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  // TON referral earnings state
  const [tonEarnings, setTonEarnings] = useState(0);
  const [isClaimingTon, setIsClaimingTon] = useState(false);

  // Fetch referral counts, pending rewards, and TON earnings via TanStack Query
  const { data: frensData, isPending: dataPending, error: dataError } = useFrensDataQuery(telegramId);
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const tgFirstName = mounted
    ? window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || username || "Quantum User"
    : "Quantum User";

  // Fetch referral list via TanStack Query
  const { data: referralList = [], isPending: listPending, error: listError } = useReferralListQuery(telegramId);

  // Show skeleton while either query hasn't resolved yet (covers disabled + fetching states)
  const loading = dataPending || listPending;

  // Sync query data into local state and context
  useEffect(() => {
    if (!frensData) return;
    queueMicrotask(() => {
      setReferralNum(frensData.referralCount);
      setPendingRewards(frensData.pendingRewards);
      setTonEarnings(frensData.tonEarnings);
    });
  }, [frensData, setReferralNum]);



  // Profile photos for referral list — custom QC pp only, initials fallback
  const photoUrls = useQcProfilePhotosBatch(referralList.map((r) => r.id));

  const referralsListRef = useRef<HTMLDivElement>(null);
  const referralsVirtualizer = useWindowVirtualizer({
    count: referralList.length,
    estimateSize: () => 72,
    overscan: 5,
    scrollMargin: referralsListRef.current?.offsetTop ?? 0,
  });

  async function handleClaimRewards() {
    if (pendingRewards <= 0 || isClaiming) return;

    setIsClaiming(true);
    try {
      const result = await claimTier2Rewards();

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      const data = result?.data;
      if (data?.success && data.claimedAmount > 0) {
        haptics.success();
        toast.success(`Claimed ${data.claimedAmount.toFixed(0)} QNTM!`);
        setPendingRewards(0);
        const currentBalance = Number(String(localStorage.getItem(`QAmount_${telegramId}`) || "0").replace(/,/g, ""));
        const newBalance = currentBalance + data.claimedAmount;
        const formattedBalance = newBalance.toLocaleString("en-US", { maximumFractionDigits: 0 });
        localStorage.setItem(`QAmount_${telegramId}`, formattedBalance);
        SetMainQuantAmount(formattedBalance);
      } else if (data?.claimedAmount === 0) {
        toast.info("No pending rewards to claim");
      } else {
        toast.error("Failed to claim rewards");
      }
    } catch (error) {
      console.error("Claim error:", error);
      haptics.error();
      toast.error("Failed to claim rewards");
    } finally {
      setIsClaiming(false);
    }
  }

  async function handleClaimTonEarnings() {
    if (tonEarnings <= 0 || isClaimingTon) return;

    setIsClaimingTon(true);
    try {
      const result = await claimReferralTon();

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      const data = result?.data;
      if (data?.success && data.claimedAmount > 0) {
        haptics.success();
        toast.success(`Claimed ${data.claimedAmount.toFixed(4)} TON!`);
        setTonEarnings(0);
      } else if (data?.claimedAmount === 0) {
        toast.info("No pending TON to claim");
      } else {
        toast.error("Failed to claim TON");
      }
    } catch (error) {
      console.error("Claim TON error:", error);
      haptics.error();
      toast.error("Failed to claim TON");
    } finally {
      setIsClaimingTon(false);
    }
  }
  return (
    <div className="min-h-screen pb-24">

      <div>
        {(dataError || listError) ? (
          <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold text-white">Frens</h1>
            <Card className="bg-red-500/10 text-white">
              <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                <Icon icon="lucide:wifi-off" className="w-10 h-10 text-red-400" />
                <p className="text-sm text-neutral-300">Failed to load referrals. Pull down to retry.</p>
              </CardContent>
            </Card>
          </div>
        ) : !loading ? (
          <div className="p-4 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Inviting your friends has never been easier, {tgFirstName}.
              </h1>
              <p className="text-sm text-neutral-400 mt-2">
                Let your friend scan your QC QR code or just share your referral link. Done.
              </p>
            </div>

            {/* TON Referral Earnings Card */}
            <Card className="bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_34%),linear-gradient(135deg,#1a1a1a,#0d0d0d)] backdrop-blur-xl text-white overflow-hidden relative">
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                      <Image src="/svg/ton-logo.svg" alt="TON" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <div className="text-sm text-neutral-400 font-medium">TON referral earnings</div>
                      <div className="text-2xl font-bold text-white">
                        {tonEarnings.toFixed(2)} <span className="text-base font-medium text-neutral-400">TON</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleClaimTonEarnings}
                    disabled={isClaimingTon || tonEarnings <= 0}
                    className="h-10 px-5 bg-white text-black hover:bg-white/90 font-bold disabled:opacity-50 transition-all active:scale-95 rounded-xl"
                  >
                    {isClaimingTon ? <ButtonLoader /> : "Claim"}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  Earn 0.1% from your referrals&apos; fees when they trade on QC RocketStart.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a]/80 backdrop-blur-xl text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <CardContent className="p-6 space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-amber-400">Earn 10%</div>
                    <div className="text-sm text-neutral-400 font-medium">From your invites</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12">
                        <Lottie
                          lottieRef={lottieRef}
                          animationData={handshakeAnimationData}
                          loop={1}
                          autoplay={true}
                        />
                      </div>
                      <div className="text-4xl font-bold text-white">
                        {referralsNum}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 font-medium mt-1">Invited friends</div>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-amber-400">Earn 2%</div>
                      <div className="text-sm text-neutral-400 font-medium">From their invites</div>
                    </div>
                  </div>

                  {/* Pending Rewards Section */}
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:gift" className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-sm font-medium text-white">Pending rewards</div>
                          <div className="text-lg font-bold text-white">
                            {pendingRewards.toFixed(0)} QNTM
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleClaimRewards}
                        disabled={isClaiming || pendingRewards <= 0}
                        className="h-9 px-4 bg-white text-black hover:bg-white/90 font-bold disabled:opacity-50 transition-all active:scale-95 rounded-xl text-xs"
                      >
                        {isClaiming ? <ButtonLoader /> : "Claim"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                    When your invited friends invite others, you earn 2% of their earnings.
                  </p>
                </div>
              </CardContent>
            </Card>

            <InvitePopup />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                <span>Your referrals</span>
              </div>

              <div>
                {referralList && referralList.length > 0 ? (
                  <div ref={referralsListRef}>
                    <div className="relative" style={{ height: `${referralsVirtualizer.getTotalSize()}px` }}>
                      {referralsVirtualizer.getVirtualItems().map((virtualItem) => {
                        const referral = referralList[virtualItem.index];
                        return (
                          <div
                            key={referral.id}
                            className="absolute top-0 left-0 w-full"
                            style={{ transform: `translateY(${virtualItem.start - referralsVirtualizer.options.scrollMargin}px)` }}
                            ref={referralsVirtualizer.measureElement}
                            data-index={virtualItem.index}
                          >
                            <div className="pb-3">
                              <Card className="bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 transition-all active:scale-[0.98]">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                                      {photoUrls[referral.id] ? (
                                        <Image
                                          src={photoUrls[referral.id]!}
                                          alt={referral.username || "User"}
                                          width={40}
                                          height={40}
                                          className="w-full h-full object-cover"
                                          unoptimized
                                        />
                                      ) : (
                                        <span className="text-sm font-bold text-neutral-300">
                                          {referral.username ? referral.username.charAt(0).toUpperCase() : "?"}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm text-neutral-200">{referral.username}</div>
                                      {(referral.referralCount ?? 0) > 0 && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <Icon icon="radix-icons:people" className="w-3 h-3 text-neutral-500" />
                                          <span className="text-xs text-neutral-500">{referral.referralCount}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center px-3 py-1.5">
                                    <span className="font-bold text-sm text-green-400">
                                      +{((referral.quantamount * 10) / 100).toFixed(0)} QNTM
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                    <Icon icon="lucide:user-plus" className="w-16 h-16 mb-4 opacity-50" />
                    <span className="font-semibold text-base">Invite some frens to see them here!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <Skeleton className="h-16 w-[90%]" />
            <Skeleton className="h-4 w-[86%]" />
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="h-3 w-32 mb-2" />
                      <Skeleton className="h-7 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-20 rounded-xl" />
                </div>
                <Skeleton className="h-3 w-full mt-3" />
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a]/80">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="flex flex-col items-end">
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                </div>
                <div className="pt-4">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-5 h-5 rounded" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-16 rounded-xl" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-white/5">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrensContent;
