"use client";

import { useEffect, useState, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useFrenContext } from "@/app/(contexts)/FrensContext";

import { useRouter } from "next/navigation";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useFrensDataQuery } from "@/app/(hooks)/queries/use-frens-data";
import { useReferralListQuery } from "@/app/(hooks)/queries/use-referral-list";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Loader from "@/app/(components)/Loader";
import InvitePopup from "./(components)/InvitePopup";
import handshakeAnimationData from "@/public/lottie/handshake-lottie.json";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import Image from "next/image";
import { useProfilePhotos } from "@/app/(hooks)/useProfilePhoto";
import { claimTier2Rewards, claimReferralTon } from "./actions";

const FrensContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const { referralsNum, setReferralNum } = useFrenContext();
  const router = useRouter();
  const { telegramId, SetMainQuantAmount } = useUserContext();
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  // TON referral earnings state
  const [tonEarnings, setTonEarnings] = useState(0);
  const [isClaimingTon, setIsClaimingTon] = useState(false);

  // Fetch referral counts, pending rewards, and TON earnings via TanStack Query
  const { data: frensData } = useFrensDataQuery(telegramId);
  const secondTierCount = frensData?.secondTierCount ?? 0;

  // Fetch referral list via TanStack Query
  const { data: referralList = [], isLoading: loading } = useReferralListQuery(telegramId);

  // Sync query data into local state and context
  useEffect(() => {
    if (!frensData) return;
    setReferralNum(frensData.referralCount);
    setPendingRewards(frensData.pendingRewards);
    setTonEarnings(frensData.tonEarnings);
  }, [frensData, setReferralNum]);

  useEffect(() => {
    router.prefetch("/frens/referrals");
  }, [router]);

  // Profile photos for referral list — TanStack Query handles caching/dedup
  const photoUrls = useProfilePhotos(referralList.map((r) => r.id));

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
        toast.success(`Claimed ${data.claimedAmount.toFixed(4)} TON!`);
        setTonEarnings(0);
      } else if (data?.claimedAmount === 0) {
        toast.info("No pending TON to claim");
      } else {
        toast.error("Failed to claim TON");
      }
    } catch (error) {
      console.error("Claim TON error:", error);
      toast.error("Failed to claim TON");
    } finally {
      setIsClaimingTon(false);
    }
  }
  return (
    <div className="min-h-screen pb-24">

      <div>
        {!loading ? (
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">Frens</h1>
            </div>

            {/* TON Referral Earnings Card */}
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-[#333] backdrop-blur-xl text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                      <Image src="/svg/ton-logo.svg" alt="TON" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 font-medium">TON Referral Earnings</div>
                      <div className="text-2xl font-bold text-white">
                        {tonEarnings.toFixed(4)} <span className="text-base font-medium text-gray-400">TON</span>
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
                <p className="text-xs text-gray-500 mt-3">
                  Earn 0.1% from your referrals&apos; fees when they trade on QC RocketStart.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a]/80 border-[#333] backdrop-blur-xl text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <CardContent className="p-6 space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/20">
                      EARN 10%
                    </Badge>
                    <div className="text-sm text-gray-400 font-medium">FROM YOUR INVITES</div>
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
                      <div className="text-4xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {referralsNum}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium mt-1">INVITED FRENS</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#333]">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Badge variant="secondary" className="bg-white/10 text-gray-300 hover:bg-white/20 border-white/10">
                        EARN 2%
                      </Badge>
                      <div className="text-sm text-gray-400 font-medium">FROM THEIR INVITES</div>
                    </div>
                    {secondTierCount > 0 && (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <Icon icon="lucide:users-2" className="w-8 h-8 text-gray-400" />
                          <div className="text-3xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            {secondTierCount}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-1">2ND TIER FRENS</div>
                      </div>
                    )}
                  </div>

                  {/* Pending Rewards Section */}
                  <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:gift" className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-sm font-medium text-white">Pending Rewards</div>
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

                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    When your invited friends invite others, you earn 2% of their earnings.
                  </p>
                </div>
              </CardContent>
            </Card>

            <InvitePopup />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <Icon icon="lucide:users" className="w-5 h-5" />
                <span>Your Referrals</span>
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
                              <Card className="bg-white/5 border-white/5 text-white backdrop-blur-sm hover:bg-white/10 transition-all active:scale-[0.98]">
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-[#333] overflow-hidden">
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
                                        <Icon icon="lucide:user" className="w-5 h-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="font-medium text-sm text-gray-200">{referral.username}</div>
                                  </div>
                                  <div className="flex items-center gap-2 bg-[#2a2a2a]/50 px-3 py-1.5 rounded-lg border border-[#333]">
                                    <Icon icon="lucide:trophy" className="w-3.5 h-3.5 text-yellow-500" />
                                    <span className="font-bold text-sm text-yellow-500">
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
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Icon icon="lucide:user-plus" className="w-16 h-16 mb-4 opacity-50" />
                    <span className="font-semibold text-base">Invite some frens to see them here!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
};

export default FrensContent;
