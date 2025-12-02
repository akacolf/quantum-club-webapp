'use client';

import { useGameContext } from '@/app/(contexts)/MiningContext';
import { dbfs } from '@/app/(firebase)/client';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useTelegramBackButton } from '@/app/(hooks)/useBackButton';
import React, { useEffect, useState } from 'react';

export default function AnswerPage() {
    const { telegramId, SetMainQuantAmount } = useGameContext();
    const [taskId, setTaskId] = useState("");
    const [textBox, setTextBox] = useState("");
    const router = useRouter();

    useTelegramBackButton("/earn");

    useEffect(() => {
        router.prefetch('/earn/9CXx152NbBKOKE2');
    }, [router]);

    const [isCorrect, setIsCorrect] = useState(true);
    const [isLoading] = useState(false);

    useEffect(() => {
        const cookies = document.cookie.split('; ');
        const taskIdCookie = cookies.find(cookie => cookie.startsWith('taskId='));
        if (taskIdCookie) {
            const taskIdValue = taskIdCookie.split('=')[1];
            setTaskId(taskIdValue);
        }
    }, [])

    async function check() {
        const userTaskRef = doc(dbfs, `user/${telegramId}/tasks/${taskId}`);
        const miningDataValue = doc(dbfs, `user/${telegramId}/miningData/values`);
        const snapshotUserTask = await getDoc(userTaskRef);
        if (snapshotUserTask.exists()) {
            const complete = snapshotUserTask.data().completed;
            if (complete === true) {
                router.push("/earn")
            } else {

            }
        } else {
            const taskRef = doc(dbfs, `tasks/${taskId}`);
            const snapshotTask = await getDoc(taskRef);
            if (snapshotTask.exists()) {
                const quantVal = snapshotTask.data().quantReward;
                const el = snapshotTask.data().el;
                const platform = snapshotTask.data().platform;
                const snapshotValues = await getDoc(miningDataValue);
                if (snapshotValues.exists()) {
                    const quant = snapshotValues.data().QuantAmount;
                    const total = Number(quant) + quantVal;
                    if (textBox === el) {
                        if (snapshotUserTask.exists()) {
                            const complete = snapshotUserTask.data().completed;
                            if (complete) {
                                router.push("/earn")
                            } else {
                                const date = new Date(Date.now());
                                const formattedDate =
                                    `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                await setDoc(userTaskRef, {
                                    quant: quantVal,
                                    completed: true,
                                    Date: formattedDate,
                                    platform: platform,
                                });
                                updateDoc(miningDataValue, {
                                    QuantAmount: total,
                                });
                                const formattedAmount = total.toLocaleString("en-US", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                });
                                if (typeof window !== "undefined") {
                                    localStorage.setItem("QAmount", formattedAmount);
                                }
                                SetMainQuantAmount(formattedAmount);
                                router.push("/earn")
                            }
                        } else {
                            const date = new Date(Date.now());
                            const formattedDate =
                                `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                            await setDoc(userTaskRef, {
                                quant: quantVal,
                                completed: true,
                                Date: formattedDate,
                                platform: platform,
                            });
                            updateDoc(miningDataValue, {
                                QuantAmount: total,
                            });
                            const formattedAmount = total.toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            });
                            if (typeof window !== "undefined") {
                                localStorage.setItem("QAmount", formattedAmount);
                            }
                            SetMainQuantAmount(formattedAmount);
                            router.push("/earn")
                        }
                    } else {

                        setIsCorrect(false)
                    }
                }
            }
        }
    }
    return (
                <div className='bg-black flex flex-col'>
                    {!isLoading &&
                        (<div> <div className='flex flex-col ml-4 mt-28'>
                            {/*<button onClick={()=>router.back()}>{"<"}</button> {/*Back Button */}
                            <label className='mb-2 text-lg font-medium text-gray-400'>Answer</label>
                            <input
                                type="text" id="answerWrong"
                                className={`${isCorrect ? "bg-[#303030] text-white text-sm rounded-lg max-w-80 p-2.5" : "bg-[#303030] text-white text-sm rounded-lg max-w-80 p-2.5 border border-red-600"}`}
                                onInput={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    setTextBox(input.value = input.value.toUpperCase());
                                    ; setIsCorrect(true)
                                }}>
                            </input>
                        </div>
                            <div className='mt-4 ml-4'>
                                <button onClick={() => check()} className='bg-white font-semibold text-black px-6 py-2 rounded-full'>
                                    Check
                                </button>
                            </div>
                        </div>)}
                </div>
    )
}