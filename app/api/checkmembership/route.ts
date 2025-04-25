import { NextResponse } from "next/server";

export async function POST(req) {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    console.error("BOT TOKEN ERROR");
    return NextResponse.json(
      { error: "Telegram bot token is missing" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { tgIdNumerical, channelUsername } = body;
  if (!tgIdNumerical || !channelUsername) {
    return NextResponse.json(
      { error: "Invalid request: missing telegramId or channelUsername" },
      { status: 400 }
    );
  }
  try {
    let formattedChatId = channelUsername;
    if (
      !channelUsername.startsWith("@") &&
      !channelUsername.startsWith("-100")
    ) {
      formattedChatId = "@" + channelUsername;
    }
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(
      formattedChatId
    )}&user_id=${tgIdNumerical}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Telegram API error: ${response.status} ${errorText}` },
        { status: 500 }
      );
    }
    const data = await response.json();
    if (data.ok) {
      const status = data.result.status;
      const isMember = ["creator", "administrator", "member"].includes(status);
      return NextResponse.json({ isMember });
    } else {
      return NextResponse.json(
        { error: `Telegram API returned false: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to check channel membership: ${error.message} || 'Unkown Error'}`,
      },
      { status: 500 }
    );
  }
}
