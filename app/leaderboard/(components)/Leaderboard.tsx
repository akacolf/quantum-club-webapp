"use client";

import { useRef } from "react";
import Image from "next/image";
import { firstPlaceMedal, secondPlaceMedal, thirdPlaceMedal, logoWhite } from "@/public";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { Icon } from "@iconify/react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

export default function LeaderboardList() {
    const { leaderboardContext } = useLeaderboardContext();
    const listRef = useRef<HTMLDivElement>(null);

    /* eslint-disable react-hooks/refs -- TanStack Virtual is designed to read refs during render for scrollMargin */
    const virtualizer = useWindowVirtualizer({
        count: leaderboardContext?.length ?? 0,
        estimateSize: () => 64,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });
    /* eslint-enable react-hooks/refs */

    return (
        <div className="mt-6 px-4 pb-24">
            <div className="flex items-center gap-2 mb-2">
                <Icon icon="lucide:trophy" className="w-5 h-5 text-white/40" />
                <span className="text-[10px] text-white/40 uppercase tracking-[0.1em] font-bold">Top Users</span>
            </div>

            {leaderboardContext && leaderboardContext.length > 0 && (
                <div ref={listRef}>
                    <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const item = leaderboardContext[virtualItem.index];
                            const index = virtualItem.index;
                            return (
                                <div
                                    key={index}
                                    className="absolute top-0 left-0 w-full"
                                    style={{ transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)` }}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                >
                                    <div
                                        className={`p-4 flex items-center justify-between rounded-2xl transition-all active:scale-[0.98] border border-transparent ${index < 3 ? 'bg-white/5 border-white/5 shadow-sm' : 'hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 flex items-center justify-center">
                                                <Image src={logoWhite} alt="logo" height={24} width={24} className="opacity-80" />
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm ${index === 0 ? 'text-yellow-500' :
                                                    index === 1 ? 'text-gray-300' :
                                                        index === 2 ? 'text-orange-400' :
                                                            'text-white'
                                                    }`}>
                                                    {item.username}
                                                </div>
                                                <div className="font-medium text-xs text-gray-500">
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
                                            {index > 2 && <div className="text-gray-500 pr-2">#{index + 1}</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
