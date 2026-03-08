"use client"
import { dbfs } from "@/app/(firebase)/client";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

import { getMaintenance } from "@/lib/getMaintenance";

function freshUserData() {
  return {
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
  };
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
  const result = { ...freshUserData(), telegramId: telegramIdEncrypted, status: "" };
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
      result.remainingSolveToEarn = data.remainingSolveToEarn ?? 0;
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

    // Load qcUsername from Firestore first, then fallback to localStorage
    const firestoreQcUsername = userSnapshot.exists() ? userSnapshot.data()?.qcUsername : null;
    if (firestoreQcUsername) {
      result.qcUsername = firestoreQcUsername;
      if (typeof window !== "undefined") {
        localStorage.setItem(`qcUsername_${telegramIdEncrypted}`, firestoreQcUsername);
      }
    } else {
      const savedQcUsername = typeof window !== "undefined"
        ? localStorage.getItem(`qcUsername_${telegramIdEncrypted}`)
        : null;
      result.qcUsername = savedQcUsername || "";
    }

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
  const userData = freshUserData();
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
        localStorage.setItem(`QAmount_${telegramIdEncrypted}`, formattedQuant);
        // Process referral server-side (cross-user writes require Admin SDK)
        if (referrerID && referrerID !== telegramIdEncrypted) {
          try {
            const { processReferral } = await import("@/app/(login)/actions");
            await processReferral({
              referrerId: referrerID,
              newUserQcId: telegramIdEncrypted,
              quantValue: Number(quantValue),
            });
          } catch (err) {
            console.error("Referral processing error:", err);
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
          // Load qcUsername from Firestore for existing users
          if (userData2?.qcUsername) {
            userData.qcUsername = userData2.qcUsername;
            if (typeof window !== "undefined") {
              localStorage.setItem(`qcUsername_${telegramIdEncrypted}`, userData2.qcUsername);
            }
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
          userData.remainingSolveToEarn = data.remainingSolveToEarn ?? 0;
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
            const { checkUserRank } = await import("@/app/(login)/actions");
            const rankResult = await checkUserRank({ userName: username });
            if (rankResult?.serverError) {
              throw new Error(rankResult.serverError);
            }
            const rankData = rankResult?.data;
            if (rankData) {
              sessionStorage.setItem("userLeaderRank", String(rankData.rank));
              userData.userRank = rankData.rank;
            }
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