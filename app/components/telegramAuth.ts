'use client'
export async function authenticateUser() {
    const checkAuth = async () => {
        const response = await fetch('/api/session')
        if (response.ok) {
            return true
        }
    }
    try{
        checkAuth()
    }finally{

        const WebApp = window?.Telegram?.WebApp
        if(!WebApp) return false;
        WebApp.ready()
        const initData = WebApp.initData;
        if(initData) {
            try{
                const response = await fetch('/api/auth', {
                    method:'POST',
                    headers: {
                        'Content-Type':'application/json',
                    },
                    body:JSON.stringify({initData}),
                })
                if(response.ok){
                    return true
                } else{
                    console.error("Authentication failed")
                    return false
                }
            } catch(error) {
                console.error("Error during authentication:",error)
                return false
            }
        }
    }
}