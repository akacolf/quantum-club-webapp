'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useFrenContext } from '@/app/contexts/FrensContext';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { dbfs } from '@/app/firebase/firebaseConfig';
import { useGameContext } from '@/app/contexts/MiningContext';
import Loader from '@/app/loading';
import { ButtonLoader } from '@/app/components/ButtonLoader';
const ReferralsPage = () => {

	const router = useRouter();
	const {
		referralsContext,
		addReferral,
	} = useFrenContext();
	const { telegramId } = useGameContext();
	const [errorMessage, setErrorMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [totalReferralSize, setTotalReferralSize] = useState(0)
	const [viewButton, setViewButton] = useState("View more")
	useEffect(() => {
		if (typeof window !== "undefined") {
			const tg = window.Telegram.WebApp;
			tg.BackButton.show();

			const handleBackButtonClick = () => {
				router.push('/frens');
			};

			tg.BackButton.onClick(handleBackButtonClick);

			// Cleanup function
			return () => {
				tg.BackButton.offClick(handleBackButtonClick);
			};
		}
	}, [router]);
	useEffect(() => {
		const fetchReferralsData = async () => {
			try {
				// if(referralsContext.length > 0) return;
				if (sessionStorage.getItem("FrenLoad") == "InviteFren") {
					setErrorMessage(
						<div className="flex flex-col font-bold text-lg justify-center">
							<div className="flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 48 48">
									<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" />
									<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="21.5" ry="7.024" transform="rotate(-30 24 24)" />
									<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" transform="rotate(-60 24 24)" />
									<circle cx="24" cy="24.001" r="2.695" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
									<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m33.527 6.827l-8.221 14.82m9.072 8.512l-8.069-4.789" />
								</svg>
							</div>
							<div className="flex justify-center mt-4">
								<span className="font-semibold text-base">Invite some frens to see them here!</span>
							</div>
						</div>
					);
					setLoading(false);
					return;
				}

				const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
				const snapshot = await getDocs(referralsRef);
				if (!snapshot.empty) {
					const snapshotSize = Number(snapshot.size)
					setTotalReferralSize(snapshotSize)

					sessionStorage.setItem("Num", snapshot.size);
					const referralLocalSize = Number(referralsContext.length)
					if (snapshotSize === referralLocalSize || (snapshotSize !== referralLocalSize && referralsContext.length % 2 === 0 && referralsContext.length !== 0)) {
						return;
					}
					if (snapshotSize !== referralLocalSize) {
						let checkUser = 1
						for (const docSnapshot of snapshot.docs) {
							if (checkUser === 21) break;
							const referredTelegramId = docSnapshot.id;
							try {
								let username;
								const referredRef = doc(dbfs, `user/${referredTelegramId}`)
								const referredData = await getDoc(referredRef)
								username = referredData.data().username;
								const coinsRef = doc(
									dbfs,
									`user/${referredTelegramId}/miningData/values`
								);
								const coinsSnapshot = await getDoc(coinsRef);
								const coins =
									coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
										? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
										: "0.00";
								const amount = Number(coins);
								const newReferral = { id: referredTelegramId, userName: username, quantamount: amount };
								addReferral(newReferral);
								checkUser++
							} catch (error) {
								console.error(error);
								return {
									id: referredTelegramId,
									username: "Error",
									coins: "0.00",
								};
							}

						}
					}

				} else {
					setLoading(false);
					sessionStorage.setItem("FrenLoad", "InviteFren");
					setErrorMessage(
						<div className="flex flex-col font-bold text-lg justify-center">
							<div className="flex items-center justify-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 48 48">
									<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" />
									<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="21.5" ry="7.024" transform="rotate(-30 24 24)" />
									<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" transform="rotate(-60 24 24)" />
									<circle cx="24" cy="24.001" r="2.695" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
									<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m33.527 6.827l-8.221 14.82m9.072 8.512l-8.069-4.789" />
								</svg>
							</div>
							<div className="flex justify-center mt-4">
								<span className="font-semibold text-base">Invite some frens to see them here!</span>
							</div>
						</div>
					);
				}
			} catch (error) {
				console.error(error)
				setErrorMessage(
					"There was an error when loading your invited frens: " + error
				);
			} finally {
				setLoading(false);
			}
		};

		fetchReferralsData();
	}); // referralsContext'e de bağımlılık ekledik

	async function lookViewMore() {
		try {
			setViewButton(<ButtonLoader />)
			const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
			const snapshot = await getDocs(referralsRef);
			const checkReferral = referralsContext.length
			let contextTotal = referralsContext.length
			if (!snapshot.empty) {
				try {
					for (const docSnapshot of snapshot.docs) {
						const referredTelegramId = docSnapshot.id;
						try {
							if (contextTotal >= checkReferral + 20) {
								return;
							}
							let username;
							const foundUser = referralsContext.find(user => user.id === referredTelegramId);
							if (foundUser) {
								continue;
							}
							const referredRef = doc(dbfs, `user/${referredTelegramId}`)
							const referredData = await getDoc(referredRef)
							username = referredData.data().username;
							const coinsRef = doc(
								dbfs,
								`user/${referredTelegramId}/miningData/values`
							);
							const coinsSnapshot = await getDoc(coinsRef);
							const coins =
								coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
									? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
									: "0.00";
							const amount = Number(coins);
							const newReferral = { id: referredTelegramId, userName: username, quantamount: amount };
							addReferral(newReferral);
							contextTotal++
						} catch (error) {
							console.error(error);
							return {
								id: referredTelegramId,
								username: "Error",
								coins: "0.00",
							};
						}
					}
				} finally {
					setViewButton("View more")
				}

			} else {
				setLoading(false);
				sessionStorage.setItem("FrenLoad", "InviteFren");
				setErrorMessage(
					<div className="flex flex-col font-bold text-lg justify-center">
						<div className="flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 48 48">
								<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" />
								<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="21.5" ry="7.024" transform="rotate(-30 24 24)" />
								<ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" transform="rotate(-60 24 24)" />
								<circle cx="24" cy="24.001" r="2.695" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
								<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m33.527 6.827l-8.221 14.82m9.072 8.512l-8.069-4.789" />
							</svg>
						</div>
						<div className="flex justify-center mt-4">
							<span className="font-semibold text-base">Invite some frens to see them here!</span>
						</div>
					</div>
				);
			}
		} catch (error) {
			console.error(error)
		}
	}
	return (
		<AnimatePresence>
			<motion.main
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className='bg-black overflow-auto'
			>
				<div className="flex flex-col">
					{loading ? (
						<Loader />
					) : (
						<>
							{/*friends list*/}
							<div className="space-y-0">
								<div className="font-semibold text-2xl p-4 text-blue-500">Referrals</div>
								{
									referralsContext && referralsContext.map((referral, index) => (
										<div key={index} className="flex items-center justify-between p-4 bg-black">
											<div className="flex items-center gap-2">
												<div>
													<svg xmlns="http://www.w3.org/2000/svg" width="1.6em" height="1.6rem" viewBox="0 0 32 32">
														<path fill="#fff" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
													</svg>
												</div>
												<div>
													<div className="font-semibold text-sm">{referral.userName}</div>
												</div>
											</div>
											<div className="font-semibold text-sm">{"+" +
												((referral.quantamount * 10) / 100).toFixed(
													0
												)}{" "}
												QNTM</div>
										</div>
									))}
								{totalReferralSize >= 20 && totalReferralSize !== referralsContext.length && viewButton === "View more" ? (
									<div className="flex items-center justify-center">
										<button
											disabled={viewButton !== "View more"}
											className="bg-[#202021] text-white rounded-lg px-4 py-2"
											onClick={() => lookViewMore()}
										>
											{viewButton}</button>
									</div>
								) : (
									totalReferralSize >= 20 && totalReferralSize !== referralsContext.length && <ButtonLoader />
								)}

								<div className="text-center py-4">{errorMessage}</div>
							</div>
						</>
					)}
				</div>
			</motion.main>
		</AnimatePresence>
	)
}

export default ReferralsPage;