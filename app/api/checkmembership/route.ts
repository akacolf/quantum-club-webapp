import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/utils/session";
import { z } from "zod";
import { env } from "@/env";

const checkMembershipSchema = z.object({
  tgIdNumerical: z.union([z.string(), z.number()]).pipe(
    z.coerce.string().min(1, "telegramId is required")
  ),
  channelUsername: z.string().min(1, "channelUsername is required"),
});

export async function POST(req:NextRequest) {
  // Validate session
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await decrypt(sessionCookie);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = env.BOT_TOKEN;

  if (!botToken) {
    console.error("BOT TOKEN ERROR");
    return NextResponse.json(
      { error: "Telegram bot token is missing" },
      { status: 500 }
    );
  }
  const body = await req.json();
  const parsed = checkMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid request" },
      { status: 400 }
    );
  }
  const { tgIdNumerical, channelUsername } = parsed.data;
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

  } catch {
    return NextResponse.json(
      {
        error: `Failed to check channel membership: 'Unkown Error'}`,
      },
      { status: 500 }
    );
  }
}
