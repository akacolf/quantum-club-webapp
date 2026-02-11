"use client";

import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function QCChatPage() {
  useTelegramBackButton("/ecosystem/trade");

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 pb-28">
      <Card className="bg-card border-border max-w-sm w-full">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
            <Icon icon="solar:chat-round-dots-bold" className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold">QC Chat</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A decentralized messaging experience built for the Quantum Club ecosystem.
              Chat with other users, create groups, and more.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { icon: "solar:chat-round-dots-bold", text: "End-to-end encrypted messaging" },
              { icon: "solar:users-group-rounded-bold", text: "Group chats & communities" },
              { icon: "solar:wallet-bold", text: "Send crypto in-chat" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon icon={feature.icon} className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
