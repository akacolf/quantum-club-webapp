import Image from "next/image";
import { firstPlaceMedal, secondPlaceMedal, thirdPlaceMedal, logoWhite } from "@/public";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";

export default function LeaderboardList() {
    const { leaderboardContext } = useLeaderboardContext(); 
    return (
        <div className="mt-5 space-y-0">
            <div className="font-semibold pl-5">Ranks</div>
            {leaderboardContext && leaderboardContext.length > 0 &&
                leaderboardContext.map((item, index) => (
                    <div
                        key={index}
                        className="flex justify-between px-5 py-3 bg-black mt-2"
                    >
                        <div className="flex items-center gap-2">
                            <div>
                                <Image src={logoWhite} alt="logo" height={32} width={32}/>
                            </div>
                            <div>
                                <div className="font-medium text-sm">
                                    {item.username}
                                </div>
                                <div className="font-medium text-sm text-neutral-600">
                                    {item.QuantAmount} QNTM
                                </div>
                            </div>
                        </div>
                        <div className="font-medium flex items-center text-sm">
                            {index === 0 && (
                                <Image
                                    src={firstPlaceMedal}
                                    alt="1st place medal"
                                    width={24}
                                    height={24}
                                />
                            )}
                            {index === 1 && (
                                <Image
                                    src={secondPlaceMedal}
                                    alt="2nd place medal"
                                    width={24}
                                    height={24}
                                />
                            )}
                            {index === 2 && (
                                <Image
                                    src={thirdPlaceMedal}
                                    alt="3rd place medal"
                                    width={24}
                                    height={24}
                                />
                            )}
                            {index > 2 && <div>#{index + 1}</div>}
                        </div>
                    </div>
                ))
            }
        </div>
    )
}