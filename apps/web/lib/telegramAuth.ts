'use client'
export async function authenticateUser() {
    const checkAuth = async () => {
        try {
            const response = await fetch('/api/session')
            if (response.ok) {
                return true
            }
        } catch {
            // Session check failed, continue with WebApp auth
        }
        return false
    }
    
    // Check if already authenticated via session
    const isAuthenticated = await checkAuth()
    if (isAuthenticated) {
        return true
    }

    // Not authenticated via session, try WebApp auth
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
            console.error("Error during authentication:", error)
            return false
        }
    }
    return false
}