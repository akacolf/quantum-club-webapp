import Image from "next/image";
import { firstPlaceMedal, secondPlaceMedal, thirdPlaceMedal, logoWhite } from "@/public";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function LeaderboardList() {
    const { leaderboardContext } = useLeaderboardContext(); 
    return (
        <div className="mt-6 px-4 pb-24 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-white">Top Users</span>
            </div>
            
            <div className="space-y-1">
                {leaderboardContext && leaderboardContext.length > 0 &&
                    leaderboardContext.map((item, index) => (
                        <div 
                            key={index}
                            className={`p-4 flex items-center justify-between rounded-xl transition-colors ${
                                index < 3 ? 'bg-white/5' : 'hover:bg-white/5'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <Image src={logoWhite} alt="logo" height={24} width={24} className="opacity-80"/>
                                </div>
                                <div>
                                    <div className={`font-bold text-sm ${
                                        index === 0 ? 'text-yellow-500' :
                                        index === 1 ? 'text-gray-300' :
                                        index === 2 ? 'text-orange-400' :
                                        'text-white'
                                    }`}>
                                        {item.username}
                                    </div>
                                    <div className="font-medium text-xs text-gray-500">
                                        {item.QuantAmount} QNTM
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
                    ))
                }
            </div>
        </div>
    )
}