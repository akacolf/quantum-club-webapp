'use client';

import { ToastBar, Toaster } from "react-hot-toast";
const CopyLinkNotification = () => {
    return(
        <Toaster toastOptions={{
            duration: 3000,
            success: {
                iconTheme: {
                    primary: 'white',
                    secondary: 'black',
                },
            },
            error: {
                iconTheme: {
                    primary: 'red',
                    secondary: 'white',
                },
            },
            className: 'mt-14 font-medium',
            style: {
                padding: '0px',
                background: '#202021',
                color: '#fff',
            },
          }} position="top-center">
        {(t) => (
        <ToastBar toast={t}>
            {({ icon, message }) => (
            <div className={`flex items-center p-2 rounded-lg ${
                t.type === 'success' ? 'bg-[#202021] text-white' :
                t.type === 'error' ? 'bg-[#202021] text-white' :
                'bg-[#202021] text-white'
            }`}>
                {icon}
                <span>{message}</span>
            </div>
            )}
        </ToastBar>
        )}
    </Toaster>
        
    )
}

export default CopyLinkNotification;