"use client"
import { dbfs } from "@/app/(firebase)/firebaseConfig";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

import { getMaintenance } from "@/lib/getMaintenance";

  const userData = {
    telegramId:"",
    MainQuantAmount:"",
    rank:"",
    daily:0,
    username:"",
    walletAddress:"",
    lastActiveTime:"",
    remainingSolveToEarn:0,
    userRank:0,
    status:"",
  }
  

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function UseRegisterAndAuth({telegramIdEncrypted,initDataUnsafe}: {telegramIdEncrypted:string,initDataUnsafe: any}) {
    try {
      if(!telegramIdEncrypted || !initDataUnsafe ){
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
         if(typeof window !=="undefined"){
           localStorage.setItem("rank",rank)
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
           localStorage.setItem("QAmount", String(quantValue));
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

                  const [referredSnap, snapshotReference] = await Promise.all([
                    getDoc(userReference),
                    getDoc(referredReference),
                  ]);
              try {
                
             
                const referrerIDinDB = referredSnap.exists();
                if (snapshotReference.exists()) {
                  if (!referrerIDinDB) {
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
          userData.MainQuantAmount=formattedQuant;
          userData.username = username;
          userData.status = "completed";
          return userData;
        } else {
          const userRef = doc(dbfs, "user", telegramIdEncrypted);
          const userSnapshot = await getDoc(userRef);
          if (userSnapshot.exists()) {
            const dataUsername = userSnapshot.data().username;
            if (username !== dataUsername) {
              await updateDoc(userRef, {
                username: username,
              });
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
           localStorage.setItem("QAmount", formattedAmount);
            
          
            
            
            if (rankSnapshot.exists()) {
              const userRank = rankSnapshot.data().rank;
              userData.userRank =userRank;
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
                    localStorage.setItem("daily", "1");
                  }
                  userData.daily = 1;
                } else {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("daily", daily);
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
                localStorage.setItem("daily", "1");
              }
            }
          } else {
            await setDoc(dailyRef, {
              daily: 1,
            });
            userData.daily = 1;
            if (typeof window !== "undefined") {
              localStorage.setItem("daily", "1");
            }
          }
          //CHECK WALLET
          const lastActiveTime = Date.now();
           if (typeof window !== "undefined") {
             localStorage.setItem("lastactivetime", `${lastActiveTime}`);
           }
          userData.lastActiveTime =`${lastActiveTime}`;
          const walletResponse =await fetch("/api/tonconnections/checktonWallet", {
            method: "POST",
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify({ telegramIdEncrypted }),
          })
          const responseCheckWallet = await walletResponse.json();
          const haveWallet = responseCheckWallet.haveWallet;
          const walletAddressRes = responseCheckWallet.address;
          if (haveWallet) {
            try {
              if (typeof window !== "undefined") {
                localStorage.setItem("walletAddress", walletAddressRes);
              }
              userData.walletAddress = walletAddressRes;
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
            userData.walletAddress = "";
          };
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