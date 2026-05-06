"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { firstPlaceMedal, secondPlaceMedal, thirdPlaceMedal, logoWhite } from "@/public";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import trophyAnimationData from "@/public/lottie/trophy-lottie.json";
import { isQcTeamHandle } from "@/lib/qc-team";
import { VerifiedBadge } from "@/app/ecosystem/social/_components/VerifiedBadge";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LeaderboardListProps {
    fetchNextPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
}

export default function LeaderboardList({ fetchNextPage, hasNextPage, isFetchingNextPage }: LeaderboardListProps) {
    const { leaderboardContext } = useLeaderboardContext();
    const listRef = useRef<HTMLDivElement>(null);

    const virtualizer = useWindowVirtualizer({
        count: leaderboardContext?.length ?? 0,
        estimateSize: () => 76,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });

    const virtualItems = virtualizer.getVirtualItems();

    // Auto-fetch next page when scrolling near the end
    useEffect(() => {
        const lastItem = virtualItems[virtualItems.length - 1];
        if (!lastItem) return;
        if (
            lastItem.index >= (leaderboardContext?.length ?? 0) - 5 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [virtualItems, leaderboardContext?.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="mt-6 px-4 pb-24">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5">
                  <Lottie animationData={trophyAnimationData} loop={false} autoplay={true} />
                </div>
                <span className="font-semibold text-white">Rankings</span>
            </div>

            {leaderboardContext && leaderboardContext.length > 0 && (
                <div ref={listRef}>
                    <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                        {virtualItems.map((virtualItem) => {
                            const item = leaderboardContext[virtualItem.index];
                            const index = virtualItem.index;
                            return (
                                <div
                                    key={virtualItem.index}
                                    className="absolute top-0 left-0 w-full py-1.5"
                                    style={{ transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)` }}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                >
                                    <div
                                        className={`p-4 flex items-center justify-between rounded-2xl transition-all active:scale-[0.98] ${index < 3 ? 'bg-white/5 shadow-sm' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 flex items-center justify-center">
                                                <Image src={logoWhite} alt="logo" height={24} width={24} className="opacity-80" />
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm flex items-center gap-1 ${index === 0 ? 'text-yellow-500' :
                                                    index === 1 ? 'text-gray-300' :
                                                        index === 2 ? 'text-orange-400' :
                                                            'text-white'
                                                    }`}>
                                                    <span>{item.username}</span>
                                                    {(isQcTeamHandle(item.qcUsername) || isQcTeamHandle(item.username)) && (
                                                        <VerifiedBadge size={14} tone="team" />
                                                    )}
                                                </div>
                                                <div className="font-medium text-xs text-neutral-500">
                                                    {Number(item.QuantAmount).toLocaleString("en-US", { maximumFractionDigits: 0 })} QNTM
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-bold flex items-center text-sm">
                                            {index === 0 && (
                                                <Image src={firstPlaceMedal} alt="1st" width={32} height={32} />
                                            )}
                                            {index === 1 && (
                                                <Image src={secondPlaceMedal} alt="2nd" width={32} height={32} />
                                            )}
                                            {index === 2 && (
                                                <Image src={thirdPlaceMedal} alt="3rd" width={32} height={32} />
                                            )}
                                            {index > 2 && <div className="text-neutral-500 pr-2">#{index + 1}</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {isFetchingNextPage && (
                        <div className="flex items-center justify-center py-4 text-white/40">
                            <ButtonLoader />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
