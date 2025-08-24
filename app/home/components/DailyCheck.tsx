import Lottie from "lottie-react";
import fireAnimationData from "@/public/lottie/fire-lottie.json";
import { ButtonLoader } from "@/app/components/ButtonLoader";
import { DailyCheckInProps } from "@/lib/interfaces";


export default function DailyCheckIn({loadingButtonDay, daily, isClaimDay, loadingDay, ClaimDaily, lottieRef, TaskTimer}: DailyCheckInProps) {
    return loadingButtonDay ? (
        <div className="skeleton card flex items-center rounded-xl w-9/10 mx-auto h-18 mt-6"></div>
          ) : (
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-400 to-slate-700 rounded-xl w-9/10 mx-auto p-4 mt-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center">
                  <Lottie
                    lottieRef={lottieRef}
                    animationData={fireAnimationData}
                    loop={true}
                    autoplay={true}
                    style={{ width: "2.5em", height: "2.5em" }}
                  />
                </div>
                <div>
                  <div className="font-normal text-black text-sm">
                    {daily} days check-in
                  </div>
                  <div className="font-normal text-black text-sm">
                    Claimable in{" "}
                    <div className="inline-block">
                      <TaskTimer />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <button
                  id="dailyClaimButton"
                  onClick={() => ClaimDaily()}
                  disabled={isClaimDay}
                  className={
                    !isClaimDay
                      ? "btn w-16 h-9 btn-circle bg-white text-black text-sm" //Claim
                      : "btn w-16 h-9 btn-circle" // Claimed
                  }
                >
                  {!loadingButtonDay ? (
                    loadingDay ? (
                      <ButtonLoader />
                    ) : isClaimDay ? (
                      <div className="flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="1.2em"
                          height="1.2em"
                          viewBox="0 0 24 24"
                        >
                          <g fill="currentColor">
                            <path d="M10.243 16.314L6 12.07l1.414-1.414l2.829 2.828l5.656-5.657l1.415 1.415z" />
                            <path
                              fillRule="evenodd"
                              d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12m11 9a9 9 0 1 1 0-18a9 9 0 0 1 0 18"
                              clipRule="evenodd"
                            />
                          </g>
                        </svg>
                      </div>
                    ) : (
                      <div>Claim</div>
                    )
                  ) : (
                    <div>
                      <ButtonLoader />
                    </div>
                  )}
                </button>
              </div>
            </div>
    )
}