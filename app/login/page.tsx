"use client";
import React, { useEffect } from "react";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/app/contexts/MiningContext";
import "@/app/globals.css";
import deviceTypeDetector from "@/utils/deviceDetection";
import { useLeaderboardContext } from "@/app/contexts/LeaderboardContext";
import { authenticateUser } from "@/app/components/telegramAuth";
import { getMaintenance } from "@/lib/getMaintenance";
import Loader from "../loading";
import { TelegramAnalytics } from "@/lib/telegramAnalytics";
import { strict } from "assert";
//import Loader from "./loading";

// declaring global values for window //

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: {};
        initDataUnsafe: {
          user?: any;
        };
        ready: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        requestFullscreen: () => void;
        openTelegramLink: () => void;
        navigator: () => void;
        BackButton: {
          hide: () => void;
          show: () => void;
          onClick: () => void;
        };
        safeAreaInset: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
      };
    };
  }
}

//device type interface//
export interface DeviceState {
  isDesktop: boolean
  isMobile: boolean
  isTablet: boolean
  isLandscapeOrientation: () => boolean
  isPortraitOrientation: () => boolean
}

if (typeof window !== "undefined") {
  if (window?.Telegram?.WebApp.initDataUnsafe.user) {
    TelegramAnalytics();
  }
} else {
  if (typeof window !== "undefined") {
    (window as Window).location.href = "https://t.me/QuantumClubBot";
  }
}

const LoginScreen = () => {
    const router = useRouter();
  if (typeof window !== "undefined") {
    if (!window.Telegram?.WebApp?.initData) {
      //why don't we check initDataUnsafe here?//
      window.location.href = "https://t.me/QuantumClubBot";
      return;
    }
  }

  useEffect(() => {
    const deviceDetect = async () => {
      //type DeviceProps = "isMobile" | "isDesktop" | "isTablet"; // Define the DeviceProps type//
      const deviceType: DeviceProps = await deviceTypeDetector(window.navigator.userAgent);
      if (typeof window !== "undefined") {
        const WebApp = window?.Telegram?.WebApp;
        if(!WebApp) return;
        WebApp.ready();
        WebApp.setHeaderColor("#000000");
        WebApp.setBackgroundColor("#000000");
        if (deviceType === "mobile") {
          WebApp.requestFullscreen();
        }
        const authenticated = await authenticateUser();
        if (authenticated) {
          await registerAndAuth();
        }
        window?.Telegram?.WebApp.BackButton.hide();
      }
    };
    deviceDetect();
  }, []);

  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    const { top, bottom, left, right } = window.Telegram.WebApp.safeAreaInset;
    document.documentElement.style.setProperty("--safe-area-top", `${top}px`);
    document.documentElement.style.setProperty(
      "--safe-area-bottom",
      `${bottom}px`
    );
    document.documentElement.style.setProperty("--safe-area-left", `${left}px`);
    document.documentElement.style.setProperty(
      "--safe-area-right",
      `${right}px`
    );
  }
  const {
    setTelegramId,
    SetMainQuantAmount,
    setRank,
    setDaily,
    setUsername,
    setWalletAddress,
    setLastActiveTime,
  } = useGameContext();
  const { setUserRank } = useLeaderboardContext();

  const registerAndAuth = async () => {
    try {
      if (typeof window !== "undefined" && !window.Telegram?.WebApp) {
        return;
      }
      const maintenance = await getMaintenance();
      sessionStorage.setItem("maintenance", maintenance);
      let WebApp;
      if (typeof window !== "undefined") {
        WebApp = window?.Telegram?.WebApp;
      }
      if (process.env.NODE_ENV === "production" && maintenance) {
        router.push(`/maintenance-page`);
        return;
      }
      const user = WebApp?.initDataUnsafe.user;
      if (user) {
        const telegramId = user.id;

        const stID = String(telegramId);
        let username = user.username;
        if (username === undefined || username === null || username === "") {
          username = "Quantum User";
          setUsername("Quantum User");
        } else {
          username = username;
          setUsername(username);
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
            rank = "Unkown"; // Eğer ilk karakter sayı değilse
          }
        }

        setRank(rank);

        let newUser;

        const stringID = String(telegramId);
        const rawData = encryptData(stringID);
        const cleanData = (await rawData).toString();
        const telegramIdEncrypted = cleanData
          .replace(/['"]+/g, "")
          .replace(/[^a-zA-Z0-9]/g, "");
        setTelegramId(telegramIdEncrypted);

        //firebase auth
        const userId = await userAuth(telegramIdEncrypted);
        //have user?
        const userReferance = doc(dbfs, "user", userId);
        const userDataSnapshot = await getDoc(userReferance);
        if (!userDataSnapshot.data()) {
          newUser = true;
        } else {
          newUser = false;
        }
        if (newUser) {
          const referrerID = WebApp?.initDataUnsafe.start_param;
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
          setDoc(
            userReferance,
            {
              userArray: userArray,
              username: username,
            },
            { merge: true }
          );
          const valueData = doc(dbfs, "user", userId, "miningData", "values");
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
          localStorage.setItem("QAmount", String(quantValue));
          if (referrerID) {
            if (referrerID != userId) {
              try {
                const haveUser = doc(
                  dbfs,
                  "user",
                  referrerID,
                  "miningData",
                  "values"
                );
                const haveUserSnap = await getDoc(haveUser);
                const referrerIDinDB = haveUserSnap.exists();
                if (referrerIDinDB) {
                  const userReferance = doc(
                    dbfs,
                    "user",
                    referrerID,
                    "referrals",
                    userId
                  );
                  const snapshotReferance = await getDoc(userReferance);

                  if (!snapshotReferance.exists()) {
                    await setDoc(userReferance, {
                      telegramId: userId,
                    });
                  }
                  const referredReferance = doc(
                    dbfs,
                    "user",
                    referrerID,
                    "miningData",
                    "values"
                  );
                  const snapshotReferredValue = await getDoc(referredReferance);
                  if (snapshotReferredValue.exists()) {
                    const referredValueData = snapshotReferredValue.data();
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
                    await updateDoc(referredReferance, {
                      QuantAmount: referredUpdatedAmount,
                    });
                  }
                }
              } catch (error) {
                console.error(error.message);
              }
            }
          }

          const dailyRef = doc(dbfs, "user", userId, "miningData", "checkTime");
          setDoc(
            dailyRef,
            {
              daily: 1,
            },
            { merge: true }
          );
          setTelegramId(userId);
          setRank(rank);
          setDaily(1);
          SetMainQuantAmount(formattedQuant);
          setUsername(username);
          router.push("/story");
          return;
        } else {
          /*if (lastActiveTime) {
            const now = new Date();
            const lastActive = Number(lastActiveTime);
            const todayMidnight = new Date(now);
            todayMidnight.setUTCHours(0, 0, 0, 0);
            const isBeforeMidnight = lastActive < todayMidnight.getTime();
            if (isBeforeMidnight) {
              router.push("/home");
              return;
            }
          }*/
          const userRef = doc(dbfs, "user", userId);
          const userSnapshot = await getDoc(userRef);
          if (userSnapshot.exists()) {
            const dataUsername = userSnapshot.data().username;
            if (username !== dataUsername) {
              updateDoc(userRef, {
                username: username,
              });
            }
          }
          const valueData = doc(dbfs, "user", userId, "miningData", "values");
          const snapshot = await getDoc(valueData);
          if (snapshot.exists()) {
            const data = snapshot.data();
            const Amount = Number(data.QuantAmount);
            const firstQuant = Number(data.firstQuant);
            const formattedAmount = Amount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            const formattedfirstQuant = firstQuant.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            SetMainQuantAmount(formattedAmount);
            sessionStorage.setItem("firstQuant", formattedfirstQuant);
            localStorage.setItem("QAmount", formattedAmount);
            const userRankRef = doc(dbfs, "userRanks", userId);
            const rankSnapshot = await getDoc(userRankRef);
            if (rankSnapshot.exists()) {
              const userRank = rankSnapshot.data().rank;
              setUserRank(userRank);
            } else {
              const response = await fetch("/api/checkUserRank", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  telegramId: userId,
                  userName: username,
                  QuantAmount: Amount,
                }),
              });
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
              const data = await response.json();
              sessionStorage.setItem("userLeaderRank", data.rank);
              setUserRank(data.rank);
            }
          }
          const dailyRef = doc(dbfs, "user", userId, "miningData", "checkTime");
          const snapshotDaily = await getDoc(dailyRef);
          if (snapshotDaily.exists()) {
            const checktime = snapshotDaily.data()?.checktime;
            const daily = snapshotDaily.data()?.daily;
            if (checktime) {
              if (daily) {
                //CheckTime ve Daily varsa
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
                ); // using get time we have to convert them to operations otherwise they're not gonna be subtracted //
                const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
                if (diffInDays >= 2) {
                  setDoc(
                    dailyRef,
                    {
                      daily: 1,
                    },
                    { merge: true }
                  );
                  if (typeof window !== "undefined") {
                    localStorage.setItem("daily", "1");
                  }
                  setDaily(1);
                } else {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("daily", daily);
                  }
                  setDaily(daily);
                }
              }
            } else {
              setDoc(
                dailyRef,
                {
                  daily: 1,
                },
                { merge: true }
              );
              setDaily(1);
              if (typeof window !== "undefined") {
                localStorage.setItem("daily", "1");
              }
            }
          } else {
            setDoc(dailyRef, {
              daily: 1,
            });
            setDaily(1);
            if (typeof window !== "undefined") {
              localStorage.setItem("daily", "1");
            }
          }
          //CHECK WALLET
          const checkWallet = await fetch(
            "/api/tonconnections/checktonWallet",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId: userId }),
            }
          );
          const responseCheckWallet = await checkWallet.json();
          const haveWallet = responseCheckWallet.haveWallet;
          const walletAddressRes = responseCheckWallet.address;
          if (haveWallet) {
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("walletAddress", walletAddressRes);
              }
              setWalletAddress(walletAddressRes);
            } catch (error) {
              console.error(error.message);
            }
          } else {
            if (typeof window !== "undefined") {
              localStorage.setItem("walletAddress", "");
            }
            setWalletAddress(null);
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("lastactivetime", `${Date.now()}`);
          }
          setLastActiveTime(`${Date.now()}`);
          router.push("/home");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
  async function encryptData(telegramId:string) {
    const response = await fetch("/api/encryptID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: telegramId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const firstData = await response.json();
    const encryptedData = JSON.stringify(firstData.encryptedBase64);
    return encryptedData;
  }
  async function userAuth(telegramIdEncrypted:string) {
    const uid = String(telegramIdEncrypted);
    const responseAuth = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: uid }),
    });

    if (!responseAuth.ok) {
      const errorData = await responseAuth.text();
      throw new Error(`API Error: ${responseAuth.status} - ${errorData}`);
    }

    const { customToken } = await responseAuth.json();
    if (!customToken) throw new Error("Invalid token");
    const authTg = getAuth();
    if (authTg.currentUser) {
      return authTg.currentUser.uid;
    }
    try {
      await signInWithCustomToken(authTg, customToken);
      if (authTg.currentUser) {
        localStorage.setItem("telegramId", authTg.currentUser.uid);
        return authTg.currentUser.uid;
      } else {
        throw new Error("The user has not logged in.");
      }
    } catch (error) {
      console.error(error);
    }
  }
  return <Loader />;
};

export default LoginScreen;
