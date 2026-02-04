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
  