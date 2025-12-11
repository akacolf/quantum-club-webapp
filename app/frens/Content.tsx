"use client";

import React, { useEffect, useState, useRef } from "react";
import { dbfs } from "@/app/(firebase)/client";
import { useFrenContext } from "@/app/(contexts)/FrensContext";

import { useRouter } from "next/navigation";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { collection, doc, getDoc, getDocs, getCountFromServer, query, where } from 'firebase/firestore';
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import InvitePopup from "./(components)/InvitePopup";
import handshakeAnimationData from "@/public/lottie/handshake-lottie.json";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, User, Trophy, UserPlus, Users2, Gift } from "lucide-react";
import { toast } from "sonner";

const FrensContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const { referralsNum, setReferralNum } = useFrenContext();
  const router = useRouter();
  const { telegramId } = useGameContext();
  const {
    referralsContext,
    addReferral,
  } = useFrenContext();
  const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>("");
  const [loading, setLoading] = useState(true);
  const [totalReferralSize, setTotalReferralSize] = useState(0)
  const [viewButton, setViewButton] = useState<string | React.ReactNode>("View more")
  const [secondTierCount, setSecondTierCount] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    router.prefetch("/frens/referrals");
    const getReferralsNum = async () => {
      const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
      const snapshot = await getCountFromServer(referralsRef);
      setReferralNum(snapshot.data().count);

      const secondTierRef = collection(dbfs, `user/${telegramId}/secondTierReferrals`);
      const secondTierSnapshot = await getCountFromServer(secondTierRef);
      setSecondTierCount(secondTierSnapshot.data().count);

      // Fetch pending (unclaimed) tier 2 rewards
      const unclaimedQuery = query(secondTierRef, where("claimed", "==", false));
      const unclaimedSnapshot = await getDocs(unclaimedQuery);
      let totalPending = 0;
      unclaimedSnapshot.forEach((doc) => {
        totalPending += Number(doc.data().reward) || 0;
      });
      setPendingRewards(totalPending);
    };
    getReferralsNum();
    const fetchReferralsData = async () => {
      try {
        if (referralsContext.length > 0) return;
        if (sessionStorage.getItem("FrenLoad") == "InviteFren") {
          setErrorMessage(
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <UserPlus className="w-16 h-16 mb-4 opacity-50" />
              <span className="font-semibold text-base">Invite some frens to see them here!</span>
            </div>
          );
          setLoading(false);
          return;
        }

        const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
        const snapshot = await getDocs(referralsRef);
        if (!snapshot.empty) {
          const snapshotSize = Number(snapshot.size)
          setTotalReferralSize(snapshotSize)

          sessionStorage.setItem("Num", String(snapshot.size));
          const referralLocalSize = Number(referralsContext.length)
          if (snapshotSize === referralLocalSize || (snapshotSize !== referralLocalSize && referralsContext.length % 2 === 0 && referralsContext.length !== 0)) {
            return;
          }
          if (snapshotSize !== referralLocalSize) {
            let checkUser = 1
            for (const docSnapshot of snapshot.docs) {
              if (checkUser === 21) break;
              const referredTelegramId = docSnapshot.id;
              try {
                let username = "";
                const referredRef = doc(dbfs, `user/${referredTelegramId}`)
                const referredData = await getDoc(referredRef)
                username = referredData.data()?.username;
                const coinsRef = doc(
                  dbfs,
                  `user/${referredTelegramId}/miningData/values`
                );
                const coinsSnapshot = await getDoc(coinsRef);
                const coins =
                  coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
                    ? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
                    : "0.00";
                const amount = Number(coins);
                const newReferral = { id: referredTelegramId, username: username, quantamount: amount };
                addReferral(newReferral);
                checkUser++
              } catch (error) {
                console.error(error);
                return {
                  id: referredTelegramId,
                  username: "Error",
                  coins: "0.00",
                };
              }

            }
          }

        } else {
          setLoading(false);
          sessionStorage.setItem("FrenLoad", "InviteFren");
          setErrorMessage(
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <UserPlus className="w-16 h-16 mb-4 opacity-50" />
              <span className="font-semibold text-base">Invite some frens to see them here!</span>
            </div>
          );
        }
      } catch (error) {
        console.error(error)
        setErrorMessage(
          "There was an error when loading your invited frens: " + error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReferralsData();
  }, []);

  async function lookViewMore() {
    try {
      setViewButton(<ButtonLoader />)
      const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
      const snapshot = await getDocs(referralsRef);
      const checkReferral = referralsContext.length
      let contextTotal = referralsContext.length
      if (!snapshot.empty) {
        try {
          for (const docSnapshot of snapshot.docs) {
            const referredTelegramId = docSnapshot.id;
            try {
              if (contextTotal >= checkReferral + 20) {
                return;
              }
              let username = "";
              const foundUser = referralsContext.find(user => user.id === referredTelegramId);
              if (foundUser) {
                continue;
              }
              const referredRef = doc(dbfs, `user/${referredTelegramId}`)
              const referredData = await getDoc(referredRef)
              username = referredData.data()?.username;
              const coinsRef = doc(
                dbfs,
                `user/${referredTelegramId}/miningData/values`
              );
              const coinsSnapshot = await getDoc(coinsRef);
              const coins =
                coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
                  ? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
                  : "0.00";
              const amount = Number(coins);
              const newReferral = { id: referredTelegramId, username: username, quantamount: amount };
              addReferral(newReferral);
              contextTotal++
            } catch (error) {
              console.error(error);
              return {
                id: referredTelegramId,
                username: "Error",
                coins: "0.00",
              };
            }
          }
        } finally {
          setViewButton("View more")
        }

      } else {
        setLoading(false);
        sessionStorage.setItem("FrenLoad", "InviteFren");
        setErrorMessage(
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <span className="font-semibold text-base">Invite some frens to see them here!</span>
          </div>
        );
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function handleClaimRewards() {
    if (pendingRewards <= 0 || isClaiming) return;

    setIsClaiming(true);
    try {
      const response = await fetch("/api/claim-tier2-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId }),
      });

      const data = await response.json();

      if (data.success && data.claimedAmount > 0) {
        toast.success(`Claimed ${data.claimedAmount.toFixed(0)} QNTM!`);
        setPendingRewards(0);
        // Update local storage balance
        const currentBalance = Number(localStorage.getItem("QAmount") || "0");
        localStorage.setItem("QAmount", String(currentBalance + data.claimedAmount));
      } else if (data.claimedAmount === 0) {
        toast.info("No pending rewards to claim");
      } else {
        toast.error(data.error || "Failed to claim rewards");
      }
    } catch (error) {
      console.error("Claim error:", error);
      toast.error("Failed to claim rewards");
    } finally {
      setIsClaiming(false);
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
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/20">
                        EARN 2%
                      </Badge>
                      <div className="text-sm text-gray-400 font-medium">FROM THEIR INVITES</div>
                    </div>
                    {secondTierCount > 0 && (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <Users2 className="w-8 h-8 text-purple-400" />
                          <div className="text-3xl font-bold bg-linear-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                            {secondTierCount}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-1">2ND TIER FRENS</div>
                      </div>
                    )}
                  </div>

                  {/* Pending Rewards Section */}
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="text-sm font-medium text-white">Pending Rewards</div>
                          <div className="text-lg font-bold text-purple-400">
                            {pendingRewards.toFixed(0)} QNTM
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleClaimRewards}
                        disabled={isClaiming || pendingRewards <= 0}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold disabled:opacity-50"
                      >
                        {isClaiming ? <ButtonLoader /> : "Claim"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    When your invited friends invite others, you earn 2% of their earnings too!
                  </p>
                </div>
              </CardContent>
            </Card>

            <InvitePopup />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <Users className="w-5 h-5" />
                <span>Your Referrals</span>
              </div>

              <div className="space-y-3">
                {referralsContext && referralsContext.length > 0 ? (
                  referralsContext.map((referral, index) => (
                    <Card key={index} className="bg-[#1a1a1a]/60 border-[#333] text-white backdrop-blur-sm hover:bg-[#1a1a1a]/80 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-[#333]">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="font-medium text-sm text-gray-200">{referral.username}</div>
                        </div>
                        <div className="flex items-center gap-2 bg-[#2a2a2a]/50 px-3 py-1.5 rounded-lg border border-[#333]">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="font-bold text-sm text-yellow-500">
                            +{((referral.quantamount * 10) / 100).toFixed(0)} QNTM
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">{errorMessage}</div>
                )}

                {totalReferralSize >= 20 && totalReferralSize !== referralsContext.length && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      disabled={viewButton !== "View more"}
                      onClick={() => lookViewMore()}
                      className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#2a2a2a] min-w-[120px]"
                    >
                      {viewButton}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 flex items-center justify-center bg-black">
            <Loader />
          </div>
        )}
      </div>
    </div>
  );
};

export default FrensContent;
