 export async function encryptData(telegramId: string): Promise<string> {
    const response = await fetch("/api/encryptID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: telegramId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const firstData = await response.json();
    const encryptedData = JSON.stringify(firstData.encryptedBase64);
    return encryptedData;
  }

  //user auth
  export async function userAuth(
    telegramIdEncrypted: string
  ): Promise<string | undefined> {
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
    if (authTg.currentUser) {
      return authTg.currentUser.uid;
    }
    try {
      auth?.loginWithToken(customToken);
    } catch (error) {
      throw error;
    }
  }
  