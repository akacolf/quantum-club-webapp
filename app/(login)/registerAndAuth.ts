"use client"
import { dbfs } from "@/app/(firebase)/client";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

import { getMaintenance } from "@/lib/getMaintenance";

const userData = {
  telegramId: "",
  MainQuantAmount: "",
  rank: "",
  daily: 0,
  username: "",
  walletAddress: "",
  qcUsername: "",
  lastActiveTime: "",
  remainingSolveToEarn: 0,
  userRank: 0,
  status: "",
}

/**
 * Look up a user's QC ID (encrypted TG ID) by their email.
 * Returns the QC ID if found, null otherwise.
 */
export async function lookupUserByEmail(email: string): Promise<string | null> {
  try {
    const usersRef = collection(dbfs, "user");
    const q = query(usersRef, where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id; // doc ID is the encrypted TG ID (QC ID)
    }
    return null;
  } catch (error) {
    console.error("Error looking up user by email:", error);
    return null;
  }
}

/**
 * Load existing user data by QC ID (for email/Google login without Telegram).
 * Returns the same userData shape as UseRegisterAndAuth.
 */
export async function LoadExistingUserByQCId(telegramIdEncrypted: string) {
  const result = { ...userData, telegramId: telegramIdEncrypted, status: "" };
  try {
    localStorage.setItem("telegramId", telegramIdEncrypted);

    const [maintenance] = await Promise.all([getMaintenance()]);
    sessionStorage.setItem("maintenance", maintenance);
    if (process.env.NODE_ENV === "production" && maintenance) {
      result.status = "maintenance";
      return result;
    }

    const userRef = doc(dbfs, "user", telegramIdEncrypted);
    const valueData = doc(dbfs, "user", telegramIdEncrypted, "miningData", "values");
    const [userSnapshot, valueDataSnapshot] = await Promise.all([
      getDoc(userRef),
      getDoc(valueData),
    ]);

    if (!userSnapshot.exists()) {
      result.status = "error";
      return result;
    }

    const userDocData = userSnapshot.data();
    const username = userDocData.username || "Quantum User";
    result.username = username;

    // Determine rank from userArray
    const userArray = userDocData.userArray || "";
    const rankMatch = userArray.match(/rank=(\w+)/);
    result.rank = rankMatch ? rankMatch[1] : "";
    if (typeof window !== "undefined") {
      localStorage.setItem(`rank_${telegramIdEncrypted}`, result.rank);
    }

    // Load QUANT amount
    if (valueDataSnapshot.exists()) {
      const data = valueDataSnapshot.data();
      const Amount = Number(data.QuantAmount);
      const remainingSolveToEarn = data.remainingSolveToEarn;
      result.remainingSolveToEarn = remainingSolveToEarn;
      const firstQuant = Number(data.firstQuant);
      const formattedAmount = Amount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      const formattedfirstQuant = firstQuant.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      result.MainQuantAmount = formattedAmount;
      sessionStorage.setItem("firstQuant", formattedfirstQuant);
      localStorage.setItem(`QAmount_${telegramIdEncrypted}`, formattedAmount);

      // Load user rank
      const userRankRef = doc(dbfs, "userRanks", telegramIdEncrypted);
      const rankSnapshot = await getDoc(userRankRef);
      if (rankSnapshot.exists()) {
        result.userRank = rankSnapshot.data().rank;
      }
    }

    // Load daily
    const dailyRef = doc(dbfs, "user", telegramIdEncrypted, "miningData", "checkTime");
    const snapshotDaily = await getDoc(dailyRef);
    if (snapshotDaily.exists()) {
      const daily = snapshotDaily.data()?.daily;
      result.daily = daily || 1;
      if (typeof window !== "undefined") {
        localStorage.setItem(`daily_${telegramIdEncrypted}`, String(result.daily));
      }
    }

    // Load wallet
    const lastActiveTime = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem("lastactivetime", `${lastActiveTime}`);
    }
    result.lastActiveTime = `${lastActiveTime}`;

    const savedWalletAddress = typeof window !== "undefined"
      ? localStorage.getItem(`walletAddress_${telegramIdEncrypted}`)
      : null;
    result.walletAddress = savedWalletAddress || "";

    const savedQcUsername = typeof window !== "undefined"
      ? localStorage.getItem(`qcUsername_${telegramIdEncrypted}`)
      : null;
    result.qcUsername = savedQcUsername || "";

    result.status = "completed";
  } catch (error) {
    console.error("Error loading user data:", error);
    result.status = "error";
  }
  return result;
}


/**
 * Store a linked email on the user's Firestore document.
 */
export async function linkEmailToUserDoc(telegramIdEncrypted: string, email: string): Promise<void> {
  try {
    const userRef = doc(dbfs, "user", telegramIdEncrypted);
    await updateDoc(userRef, { email });
  } catch (error) {
    console.error("Error linking email to user doc:", error);
    throw error;
  }
}

export async function UseRegisterAndAuth({ telegramIdEncrypted, initDataUnsafe, email }: { telegramIdEncrypted: string, initDataUnsafe: any, email?: string }) {
  try {
    if (!telegramIdEncrypted || !initDataUnsafe) {
      userData.status = "error";
      return userData;
    }
    userData.telegramId = telegramIdEncrypted;
    localStorage.setItem("telegramId", telegramIdEncrypted);
    const user = initDataUnsafe.user
    if (user) {
      const telegramId = user.id;
      const stID = String(telegramId);
      let username = user.username;
      if (username === undefined || username === null || username === "") {
        username = "Quantum User";
        userData.username = "Quantum User";
      } else {
        userData.username = username;
      }

      //rank config
      let rank = "";
      if (stID.length <= 9) {
        rank = "OG";
      } else {
        const firstDigit = Number(stID.charAt(0));

        if (!isNaN(firstDigit)) {
          if (firstDigit >= 1 && firstDigit <= 4) {
            rank = "LEGEND";
          } else if (firstDigit >= 5) {
            rank = "STAR";
          }
        } else {
          rank = "Unknown"; //if the first character is not a number
        }
      }

      userData.rank = rank;
      if (typeof window !== "undefined") {
        localStorage.setItem(`rank_${telegramIdEncrypted}`, rank)
      }
      let newUser;

      //paralelling maintenance and rawData
      const [maintenance] = await Promise.all([
        getMaintenance(),
      ]);
      sessionStorage.setItem("maintenance", maintenance);
      if (process.env.NODE_ENV === "production" && maintenance) {
        userData.status = "maintenance";
        return userData;
      }

      //does the user exist?
      const userReference = doc(dbfs, "user", telegramIdEncrypted);

      const valueData = doc(dbfs, "user", telegramIdEncrypted, "miningData", "values");
      const [userDataSnapshot, valueDataSnapshot] = await Promise.all([
        getDoc(userReference),
        getDoc(valueData),
      ]);
      if (!userDataSnapshot.data()) {
        newUser = true;
      } else {
        newUser = false;
      }
      if (newUser) {
        const referrerID = initDataUnsafe.start_param;
        let isBotBoolean = false;
        let isPremiumBoolean = false;
        if (user.is_bot) {
          isBotBoolean = true;
        }
        if (user.is_premium) {
          isPremiumBoolean = true;
        }
        const now = new Date().toISOString();
        const userArray = `telegramId=${telegramId}&&isBot=${isBotBoolean}&&isPremium=${isPremiumBoolean}&&referred=true&&rank=${rank}&&createdAt=${now}`;
        await setDoc(
          userReference,
          {
            userArray: userArray,
            username: username,
            ...(email && { email }),
          },
          { merge: true }
        );
        const valueData = doc(dbfs, "user", telegramIdEncrypted, "miningData", "values");
        const quantValue =
          Math.sqrt((0.01 * Math.log(telegramId)) / telegramId) *
          Math.pow(10, 8);
        const formattedNumberQuant = Number(quantValue);
        const formattedQuant = formattedNumberQuant.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        await setDoc(
          valueData,
          {
            QuantAmount: quantValue,
            firstQuant: quantValue,
          },
          { merge: true }
        );
        sessionStorage.setItem("firstQuant", formattedQuant);
        localStorage.setItem(`QAmount_${telegramIdEncrypted}`, String(quantValue));
        if (referrerID) {
          if (referrerID != telegramIdEncrypted) {
            const userReference = doc(
              dbfs,
              "user",
              referrerID,
              "referrals",
              telegramIdEncrypted
            );
            const referredReference = doc(
              dbfs,
              "user",
              referrerID,
              "miningData",
              "values"
            );
            // Store who referred the new user
            const newUserReferralInfo = doc(
              dbfs,
              "user",
              telegramIdEncrypted,
              "miningData",
              "referralInfo"
            );

            const [referredSnap, snapshotReference] = await Promise.all([
              getDoc(userReference),
              getDoc(referredReference),
            ]);
            try {


              const referrerIDinDB = referredSnap.exists();
              if (snapshotReference.exists()) {
                if (!referrerIDinDB) {
                  // Store referral info on new user (who referred them)
                  await setDoc(newUserReferralInfo, {
                    referredBy: referrerID,
                    referredAt: new Date().toISOString(),
                  });

                  await setDoc(userReference, {
                    telegramId: telegramIdEncrypted,
                  });
                  const referredValueData = snapshotReference.data();
                  const referredAmount = referredValueData?.QuantAmount;
                  let referredTenAmount = 0;
                  if (referredAmount) {
                    referredTenAmount =
                      ((Number(quantValue) + 122) * 10) / 100;
                  } else {
                    referredTenAmount = 0;
                  }
                  const referredUpdatedAmount =
                    Number(referredAmount) + Number(referredTenAmount);
                  await updateDoc(referredReference, {
                    QuantAmount: referredUpdatedAmount,
                  });

                  // 2% reward for referrer's referrer (second-tier referral)
                  try {
                    const referrerReferralInfo = doc(
                      dbfs,
                      "user",
                      referrerID,
                      "miningData",
                      "referralInfo"
                    );
                    const referrerInfoSnap = await getDoc(referrerReferralInfo);

                    if (referrerInfoSnap.exists()) {
                      const grandReferrerID = referrerInfoSnap.data()?.referredBy;

                      if (grandReferrerID && grandReferrerID !== telegramIdEncrypted && grandReferrerID !== referrerID) {
                        const grandReferrerValues = doc(
                          dbfs,
                          "user",
                          grandReferrerID,
                          "miningData",
                          "values"
                        );
                        const grandReferrerSnap = await getDoc(grandReferrerValues);

                        if (grandReferrerSnap.exists()) {
                          // 2% reward for second-tier referral - stored as pending for user to claim
                          const secondTierReward = ((Number(quantValue) + 122) * 2) / 100;

                          // Track second-tier referral with unclaimed reward
                          const grandReferrerSecondTierRef = doc(
                            dbfs,
                            "user",
                            grandReferrerID,
                            "secondTierReferrals",
                            telegramIdEncrypted
                          );
                          await setDoc(grandReferrerSecondTierRef, {
                            telegramId: telegramIdEncrypted,
                            referredBy: referrerID,
                            reward: secondTierReward,
                            claimed: false,
                            createdAt: new Date().toISOString(),
                          });
                        }
                      }
                    }
                  } catch (secondTierError) {
                    console.error("Second-tier referral error:", secondTierError);
                  }
                }
              }
            } catch (error) {
              if (error instanceof Error) {
                console.error(error.message);
              } else {
                console.error("An unknown error occurred:", error);
              }
            }
          }
        }

        const dailyRef = doc(dbfs, "user", telegramIdEncrypted, "miningData", "checkTime");

        await setDoc(
          dailyRef,
          {
            daily: 1,
          },
          { merge: true }
        );

        userData.rank = rank;
        userData.daily = 1;
        userData.MainQuantAmount = formattedQuant;
        userData.username = username;
        userData.status = "completed";
        return userData;
      } else {
        const userRef = doc(dbfs, "user", telegramIdEncrypted);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
          const userData2 = userSnapshot.data();
          const dataUsername = userData2?.username;
          const updates: Record<string, string> = {};
          if (username !== dataUsername) {
            updates.username = username;
          }
          if (email && !userData2?.email) {
            updates.email = email;
          }
          if (Object.keys(updates).length > 0) {
            await updateDoc(userRef, updates);
          }
        }

        const userRankRef = doc(dbfs, "userRanks", telegramIdEncrypted);
        const dailyRef = doc(dbfs, "user", telegramIdEncrypted, "miningData", "checkTime");

        //paralleling rank, daily, and wallet
        const [rankSnapshot, snapshotDaily] = await Promise.all([
          getDoc(userRankRef),
          getDoc(dailyRef),
        ]);
        if (valueDataSnapshot.exists()) {
          const data = valueDataSnapshot.data();
          const Amount = Number(data.QuantAmount);
          const remainingSolveToEarn = data.remainingSolveToEarn;
          userData.remainingSolveToEarn = remainingSolveToEarn;
          const firstQuant = Number(data.firstQuant);
          const formattedAmount = Amount.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          const formattedfirstQuant = firstQuant.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          userData.MainQuantAmount = formattedAmount;
          sessionStorage.setItem("firstQuant", formattedfirstQuant);
          localStorage.setItem(`QAmount_${telegramIdEncrypted}`, formattedAmount);




          if (rankSnapshot.exists()) {
            const userRank = rankSnapshot.data().rank;
            userData.userRank = userRank;
          } else {
            const response = await fetch("/api/checkUserRank", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                telegramId: telegramIdEncrypted,
                userName: username,
                QuantAmount: Amount,
              }),
            });
            if (!response.ok) {
              throw new Error("Network response was not okay.");
            }
            const data = await response.json();
            sessionStorage.setItem("userLeaderRank", data.rank);
            userData.userRank = data.rank;
          }
        }

        if (snapshotDaily.exists()) {
          const checktime = snapshotDaily.data()?.checktime;
          const daily = snapshotDaily.data()?.daily;
          if (checktime) {
            if (daily) {
              //if check time and daily exists
              const formattedDate = new Intl.DateTimeFormat("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date());
              const [month, day, year] = formattedDate.split("/");
              const formattedDateISO = `${year}-${month}-${day}`;
              const dateISO: Date = new Date(formattedDateISO);
              const dateChecktime: Date = new Date(checktime);
              const diffInMs = Math.abs(
                dateISO.getTime() - dateChecktime.getTime()
              );
              const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
              if (diffInDays >= 2) {
                await setDoc(
                  dailyRef,
                  {
                    daily: 1,
                  },
                  { merge: true }
                );
                if (typeof window !== "undefined") {
                  localStorage.setItem(`daily_${telegramIdEncrypted}`, "1");
                }
                userData.daily = 1;
              } else {
                if (typeof window !== "undefined") {
                  localStorage.setItem(`daily_${telegramIdEncrypted}`, daily);
                }
                userData.daily = daily
              }
            }
          } else {
            await setDoc(
              dailyRef,
              {
                daily: 1,
              },
              { merge: true }
            );
            userData.daily = 1;
            if (typeof window !== "undefined") {
              localStorage.setItem(`daily_${telegramIdEncrypted}`, "1");
            }
          }
        } else {
          await setDoc(dailyRef, {
            daily: 1,
          });
          userData.daily = 1;
          if (typeof window !== "undefined") {
            localStorage.setItem(`daily_${telegramIdEncrypted}`, "1");
          }
        }
        //CHECK WALLET
        const lastActiveTime = Date.now();
        if (typeof window !== "undefined") {
          localStorage.setItem("lastactivetime", `${lastActiveTime}`);
        }
        userData.lastActiveTime = `${lastActiveTime}`;

        // Check for wallet from localStorage (QC Wallet)
        const savedWalletAddress = typeof window !== "undefined"
          ? localStorage.getItem(`walletAddress_${telegramIdEncrypted}`)
          : null;

        if (savedWalletAddress) {
          userData.walletAddress = savedWalletAddress;
        } else {
          userData.walletAddress = "";
        }
        userData.status = "completed";
      }
    }
  } catch (error) {
    console.error(error);
    userData.status = "error";
    return userData;
  }

  return userData;
};