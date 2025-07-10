import { dbfs } from "@/app/firebase/firebaseConfig";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/app/contexts/MiningContext";
import { useLeaderboardContext } from "@/app/contexts/LeaderboardContext";
import { getMaintenance } from "@/lib/getMaintenance";
import { getAuth, signInWithCustomToken, User } from "firebase/auth";

export function useRegisterAndAuth() {
  //encrypt data
  async function encryptData(telegramId: string): Promise<string> {
    const response = await fetch("/api/encryptID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: telegramId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const firstData = await response.json();
    const encryptedData = JSON.stringify(firstData.encryptedBase64);
    return encryptedData;
  }
  //user auth
  async function userAuth(
    telegramIdEncrypted: string
  ): Promise<string | undefined> {
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
        const currentUser = authTg.currentUser as User;
        return currentUser.uid;
      }
    } catch (error) {
      throw error;
    }
  }
  //defining constants
  const {
    setTelegramId,
    SetMainQuantAmount,
    setRank,
    setDaily,
    setUsername,
    setWalletAddress,
    setLastActiveTime,
    setRemainingSolveToEarn,
  } = useGameContext();
  const { setUserRank } = useLeaderboardContext();
  //
  const router = useRouter();
  const registerAndAuth = async () => {
    try {
      if (typeof window !== "undefined" && !window.Telegram?.WebApp) {
        return;
      }
      let WebApp;
      if (typeof window !== "undefined") {
        WebApp = window?.Telegram?.WebApp;
      }
      //const maintenance = await getMaintenance();
      
      const user = WebApp?.initDataUnsafe.user;
      if (user) {
        const telegramId = user.id;

        const stID = String(telegramId);
        let username = user.username;
        if (username === undefined || username === null || username === "") {
          username = "Quantum User";
          setUsername("Quantum User");
        } else {
          //username = username;
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
        //paralelling maintenance and rawData
        const [maintenance, rawData] = await Promise.all([
          getMaintenance(),
          encryptData(stringID),
        ]);
        sessionStorage.setItem("maintenance", maintenance);
      
      if (process.env.NODE_ENV === "production" && maintenance) {
        router.push(`/maintenance`);
        return;
      }
        //const rawData = encryptData(stringID);
        //update cleanData
        const cleanData = rawData.toString();
        const telegramIdEncrypted = cleanData
          .replace(/['"]+/g, "")
          .replace(/[^a-zA-Z0-9]/g, "");
        setTelegramId(telegramIdEncrypted);
        
  
        //firebase auth
        const userId = await userAuth(telegramIdEncrypted);
        if (!userId) return registerAndAuth();
        //have user?
        const userReferance = doc(dbfs, "user", userId);
        //const userDataSnapshot = await getDoc(userReferance);
        const valueData = doc(dbfs, "user", userId, "miningData", "values");
        //const valueDataSnapshot = await getDoc(valueData);
        const [userDataSnapshot, valueDataSnapshot] = await Promise.all([
          getDoc(userReferance),
          getDoc(valueData),
        ]);
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
          await setDoc(
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
                const userReferance = doc(
                    dbfs,
                    "user",
                    referrerID,
                    "referrals",
                    userId
                  );
                  const referredReferance = doc(
                    dbfs,
                    "user",
                    referrerID,
                    "miningData",
                    "values"
                  );

                  const [referredSnap, snapshotReferance] = await Promise.all([
                    getDoc(userReferance),
                    getDoc(referredReferance),
                  ]);
              try {
                
                //const haveUserSnap = await getDoc(haveUser);
                const referrerIDinDB = referredSnap.exists();
                if (referrerIDinDB) {
                  
                  //const snapshotReferance = await getDoc(userReferance);

                  if (!snapshotReferance.exists()) {
                    await setDoc(userReferance, {
                      telegramId: userId,
                    });
                  }
                  
                  //const snapshotReferredValue = await getDoc(referredReferance);
                  if (referredSnap.exists()) {
                    const referredValueData = referredSnap.data();
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
                if (error instanceof Error) {
                  console.error(error.message);
                } else {
                  console.error("An unknown error occurred:", error);
                }
              }
            }
          }
          
          const dailyRef = doc(dbfs, "user", userId, "miningData", "checkTime");

          await setDoc(
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
              await updateDoc(userRef, {
                username: username,
              });
            }
          }
          //const valueData = doc(dbfs, "user", userId, "miningData", "values");
          //const snapshot = await getDoc(valueData);
          const userRankRef = doc(dbfs, "userRanks", userId);
            const dailyRef = doc(dbfs, "user", userId, "miningData", "checkTime");
            //paralleling rank and daily
            const [rankSnapshot, snapshotDaily] = await Promise.all([
              getDoc(userRankRef),
              getDoc(dailyRef),
            ]);
          if (valueDataSnapshot.exists()) {
            const data = valueDataSnapshot.data();
            const Amount = Number(data.QuantAmount);
            const remainingSolveToEarn = data.remainingSolveToEarn;
            setRemainingSolveToEarn(remainingSolveToEarn);
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
            
            //const rankSnapshot = await getDoc(userRankRef);
            
            
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
          //const dailyRef = doc(dbfs, "user", userId, "miningData", "checkTime");
          //const snapshotDaily = await getDoc(dailyRef);
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
                  await setDoc(
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
              await setDoc(
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
            await setDoc(dailyRef, {
              daily: 1,
            });
            setDaily(1);
            if (typeof window !== "undefined") {
              localStorage.setItem("daily", "1");
            }
          }
          //CHECK WALLET
          const walletPromise = fetch("/api/tonconnections/checktonWallet", {
            method: "POST",
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify({ userId }),
          });
          const lastActiveTime = Date.now();
          if (typeof window !== "undefined") {
            localStorage.setItem("lastactivetime", `${lastActiveTime}`);
          }
          setLastActiveTime(`${lastActiveTime}`);
          const checkWallet = await walletPromise;
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
              if (error instanceof Error) {
                console.error(error.message);
              } else {
                console.error("An unknown error occurred:", error);
              }
            }
          } else {
            if (typeof window !== "undefined") {
              localStorage.setItem("walletAddress", "");
            }
            setWalletAddress(null);
          };
          {/*const checkWallet = await fetch(
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
              if (error instanceof Error) {
                console.error(error.message);
              } else {
                console.error("An unknown error occurred:", error);
              }
            }
          } else {
            if (typeof window !== "undefined") {
              localStorage.setItem("walletAddress", "");
            }
            setWalletAddress(null);
          }*/}

          {/*if (typeof window !== "undefined") {
            localStorage.setItem("lastactivetime", `${Date.now()}`);
          }
          setLastActiveTime(`${Date.now()}`);*/}
          router.push("/home");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return { registerAndAuth };
};
