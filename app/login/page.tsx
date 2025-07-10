import "@/app/globals.css";
import LoginClient from "./components/LoginClient";

export default function LoginScreen() {
  return <LoginClient />;
};

{
  {/*async function encryptData(telegramId:string) {
    const response = await fetch("/api/encryptID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: telegramId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const firstData = await response.json();
    const encryptedData = JSON.stringify(firstData.encryptedBase64);
    return encryptedData;
  }*/}
  {/*async function userAuth(telegramIdEncrypted:string) {
    const uid = String(telegramIdEncrypted);
    const responseAuth = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: uid }),
    });

    if (!responseAuth.ok) {
      const errorData = await responseAuth.text();
      throw new Error(`API Error: ${responseAuth.status} - ${errorData}`);
    }

    const { customToken } = await responseAuth.json();
    if (!customToken) throw new Error("Invalid token");
    const authTg = getAuth();
    if (authTg.currentUser) {
      return authTg.currentUser.uid;
    }
    try {
      await signInWithCustomToken(authTg, customToken);
      if (authTg.currentUser) {
        const currentUser = authTg.currentUser as User; // Explicitly cast to User type
        const uid: string = currentUser.uid;
        localStorage.setItem("telegramId", uid);
        return uid;
      } else {
        throw new Error("The user has not logged in.");
      }
    } catch (error) {
      console.error(error);
    }
  }*/}
}

