'use client';

import { ToastBar, Toaster } from "react-hot-toast";

const CopyToaster = () => {
    return(
        <Toaster 
            position="top-center"
            containerStyle={{
                top: 80,
            }}
            toastOptions={{
                duration: 3000,
                className: '!bg-transparent !shadow-none !p-0 !max-w-none',
                style: {
                    background: 'transparent',
                    boxShadow: 'none',
                },
            }}
        >
        {(t) => (
            <ToastBar toast={t} style={{ padding: 0, background: 'transparent', boxShadow: 'none' }}>
                {({ icon, message }) => (
                    <div 
                        className={`${
                            t.visible ? 'animate-in fade-in zoom-in-95 slide-in-from-top-2' : 'animate-out fade-out zoom-out-95 slide-out-to-top-2'
                        } flex items-center gap-3 px-6 py-3 rounded-full bg-[#1a1a1a]/90 backdrop-blur-xl border border-[#333] shadow-2xl min-w-[200px] justify-center`}
                    >
                        {icon && (
                            <div className="shrink-0">
                                {icon}
                            </div>
                        )}
                        <div className="text-sm font-medium text-white">
                            {message}
                        </div>
                    </div>
                )}
            </ToastBar>
        )}
    </Toaster>
    )
}

export default CopyToaster;