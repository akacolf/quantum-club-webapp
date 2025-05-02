import React, { useState } from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import toast from 'react-hot-toast';

const InvitePopup = () => {
    const telegramId = localStorage.getItem("telegramId");
      const [inviteLink] = useState(
        `https://t.me/QuantumClubBot/app?startapp=${telegramId}`
      );
    const [isOpen, setIsOpen] = useState(false);
    const openPopup = () => {
        setIsOpen(true);
    }

    const closePopup = () => {
        setTimeout(() => {
            setIsOpen(false); //unmount the popup after the animation//
        }, 200); //match animation duration//
    };
    const handleSendInviteLink = ()=> () => {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
          inviteLink
        )}&text=The Quantum Era on Telegram has begun.`;
        window.open(telegramUrl, '_blank');
      };
    
      function handleCopyLink() {
        toast.success("Invitation link copied")
        navigator.clipboard.writeText(inviteLink);
      };

    return (
        <div className='flex justify-center'>
            {/*button to open popup*/}
            <button 
            onClick={openPopup} 
            className='px-20 py-3 bg-white text-black font-semibold rounded-lg whitespace-nowrap flex items-center mt-3'>
            <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" className='mr-2' viewBox="0 0 512 512">
	<path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M402 168c-2.93 40.67-33.1 72-66 72s-63.12-31.32-66-72c-3-42.31 26.37-72 66-72s69 30.46 66 72" />
	<path fill="none" stroke="#000" strokeMiterlimit="10" strokeWidth="32" d="M336 304c-65.17 0-127.84 32.37-143.54 95.41c-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.77-8.25 11.72-16.59C463.85 335.36 401.18 304 336 304Z" />
	<path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M200 185.94c-2.34 32.48-26.72 58.06-53 58.06s-50.7-25.57-53-58.06C91.61 152.15 115.34 128 147 128s55.39 24.77 53 57.94" />
	<path fill="none" stroke="#000" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" d="M206 306c-18.05-8.27-37.93-11.45-59-11.45c-52 0-102.1 25.85-114.65 76.2c-1.65 6.66 2.53 13.25 9.37 13.25H154" />
</svg>
            Invite your frens
            </button>

            {/*popup overlay*/}
            <AnimatePresence>
            {isOpen && (
                <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                onClick={() => setIsOpen(false)}
                className='fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50'
                >
                <motion.div
                initial={{y: '50%'}}
                animate={{y: 0}}
                exit={{y: '100%'}}
                transition={{type: 'spring', damping: 30, stiffness: 300}}
                onClick={(e) => e.stopPropagation()}
                className='bg-[#151516] text-white rounded-lg shadow-lg w-96 p-6'
                >
                
                        {/*title*/}
                        <div className='flex items-center justify-between border-b border-b-[#202021] p-1'>
                        <div className='text-xl text-center font-semibold' onClick={handleSendInviteLink}>Invite</div>
                        {/*close button*/}
                        <button 
                        onClick={closePopup}
                        className='text-2xl'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.2rem" height="1.2rem" viewBox="0 0 24 24">
	<path fill="#fff" d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z" />
</svg>
                        </button>
                        </div>
                        <hr className='border-gray-500 mb-4' />
                        {/*buttons*/}
                        <div className='flex flex-col gap-5 items-center'>
                            <button className='w-full py-2 bg-white text-black rounded-lg font-semibold flex justify-center items-center' onClick={()=>{handleCopyLink();closePopup();}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" className='mr-1' viewBox="0 0 24 24">
	<path fill="#000" d="M15.24 2h-3.894c-1.764 0-3.162 0-4.255.148c-1.126.152-2.037.472-2.755 1.193c-.719.721-1.038 1.636-1.189 2.766C3 7.205 3 8.608 3 10.379v5.838c0 1.508.92 2.8 2.227 3.342c-.067-.91-.067-2.185-.067-3.247v-5.01c0-1.281 0-2.386.118-3.27c.127-.948.413-1.856 1.147-2.593s1.639-1.024 2.583-1.152c.88-.118 1.98-.118 3.257-.118h3.07c1.276 0 2.374 0 3.255.118A3.6 3.6 0 0 0 15.24 2" />
	<path fill="#000" d="M6.6 11.397c0-2.726 0-4.089.844-4.936c.843-.847 2.2-.847 4.916-.847h2.88c2.715 0 4.073 0 4.917.847S21 8.671 21 11.397v4.82c0 2.726 0 4.089-.843 4.936c-.844.847-2.202.847-4.917.847h-2.88c-2.715 0-4.073 0-4.916-.847c-.844-.847-.844-2.21-.844-4.936z" />
</svg>
                              Copy link
                            </button>
                            <button className='w-full py-2 bg-white text-black rounded-lg font-semibold flex items-center justify-center' onClick={()=>{handleSendInviteLink();closePopup()}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" className='mr-1' viewBox="0 0 24 24">
	<path fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8m-4-6l-4-4l-4 4m4-4v13" />
</svg>
                              Share link
                            </button>
                        </div>
                </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    )


}

export default InvitePopup;