'use client';
import React, { useEffect } from 'react';

const MaintenanceIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" width="7em" height="7em" viewBox="0 0 512 512">
	<path fill="currentColor" fillRule="evenodd" d="M256 42.667c117.627 0 213.334 95.707 213.334 213.333S373.627 469.334 256 469.334c-117.626 0-213.333-95.707-213.333-213.334c0-117.626 95.707-213.333 213.333-213.333m.914 115.448c-20.234-15.39-46.684-20.697-65.64-16.41l32.82 32.82l-16.41 32.82l-32.82 16.411l-32.821-32.82c-4.287 18.956 1.02 45.406 16.41 65.64c20.982 16.138 46.794 21.582 65.64 16.41l74.87 71.075q21.296 18.79 42.593-2.505q22.627-22.627 0-45.255q-69.2-67.893-68.231-72.545c5.17-18.845-.274-44.658-16.41-65.64" strokeWidth="13" stroke="currentColor" />
</svg>
));
MaintenanceIcon.displayName = 'MaintenanceIcon';

const MaintenanceScreen = () => {
    const openTelegramGroup = () => {
        window.open("https://t.me/quantumclubinc", "_blank");
    };

    useEffect(() =>{
            if (typeof window === "undefined") return;

            if(!window.Telegram?.WebApp?.initData){
              window.location.href = "https://t.me/QuantumClubBot";
              return;
            }

    const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
    if (navigationType === 'reload') {
        window.location.replace("/");
        return;
    }
    }, []);

    return (
    <div className='bg-black'>
        <div className='fixed inset-0 flex flex-col items-center justify-center'>
            <MaintenanceIcon />
            <h1 className='text-2xl mt-3'>Fine-tuning experiences</h1>
            <button onClick={openTelegramGroup} className='px-4 py-2 mt-4 rounded-lg bg-[#303030] text-white'>Check community</button>
        </div>
    </div>
    )
}

export default MaintenanceScreen;
