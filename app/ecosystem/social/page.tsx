"use client";

import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function QCSocialPage() {
  useTelegramBackButton("/home");
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 pb-28">
      <Card className="bg-card border-border max-w-sm w-full">
        <CardContent className="p-8 text-center space-y-5">
          <Icon icon="solar:global-bold" className="mx-auto w-12 h-12 text-primary" />

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold">QC Social</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A decentralized social experience built for the Quantum Club ecosystem.
              Share updates, follow traders, and connect with the community.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { icon: "solar:user-circle-bold", text: "Customizable profiles & feeds" },
              { icon: "solar:chart-bold", text: "Share trades & portfolio insights" },
              { icon: "solar:star-bold", text: "Follow top traders & influencers" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <Icon icon={feature.icon} className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
