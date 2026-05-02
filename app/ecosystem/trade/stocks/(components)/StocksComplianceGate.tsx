"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";
import { XSTOCKS_ACK_LOCAL_KEY } from "@/lib/xstocks";

type Props = {
    onAcknowledge: () => void;
};

export function StocksComplianceGate({ onAcknowledge }: Props) {
    const router = useRouter();

    function handleAccept() {
        haptics.medium();
        try {
            localStorage.setItem(XSTOCKS_ACK_LOCAL_KEY, new Date().toISOString());
        } catch {}
        onAcknowledge();
    }

    function handleDecline() {
        haptics.light();
        router.back();
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div
                className="flex items-center gap-3 px-4 pb-4 pt-3 bg-card/80 backdrop-blur-sm shrink-0"
                style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
            >
                <Icon icon="solar:shield-check-bold" className="w-6 h-6 text-primary" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold text-foreground">Before you continue</h1>
                    <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Read carefully — required</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">Tokenized stocks notice</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        xStocks are blockchain tokens that track the price of a public equity. They are
                        not actual shares of the underlying company.
                    </p>
                </div>

                <ul className="space-y-3">
                    <GateItem
                        icon="solar:user-id-bold"
                        title="You are not a US person"
                        body="By continuing you confirm you are not a citizen, resident, or tax resident of the United States, the UK, Canada, Japan, Australia, Singapore, Hong Kong, or South Korea."
                    />
                    <GateItem
                        icon="solar:document-text-bold"
                        title="No ownership rights"
                        body="xStocks do not give you voting rights, dividends, or any direct claim against the underlying company. They are derivative instruments issued by a third-party custodian."
                    />
                    <GateItem
                        icon="solar:graph-up-bold"
                        title="Price tracking is not guaranteed"
                        body="The on-chain price may diverge from the market price during low liquidity, off-hours, halts, or settlement gaps."
                    />
                    <GateItem
                        icon="solar:danger-triangle-bold"
                        title="You may lose your entire investment"
                        body="Crypto assets are volatile. Tokenized stocks add issuer, custody, and bridge risk on top. Never invest more than you can afford to lose."
                    />
                    <GateItem
                        icon="solar:scale-bold"
                        title="Not investment advice"
                        body="Quantum Club does not issue these tokens, custody the underlying shares, or recommend trading them. We only surface them from the STON.fi network."
                    />
                </ul>

                <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
                    Tap <span className="text-foreground font-medium">Understood</span> to confirm you have
                    read the above and qualify under the eligibility statements. Tap{" "}
                    <span className="text-foreground font-medium">Cancel</span> to leave this page.
                </div>
            </div>

            <div
                className="bg-card/80 backdrop-blur-sm px-4 pt-3 shrink-0 flex gap-2"
                style={{ paddingBottom: "max(0.75rem, var(--tg-safe-area-inset-bottom, 0px))" }}
            >
                <Button
                    variant="ghost"
                    onClick={handleDecline}
                    className="flex-1 h-12 rounded-xl text-foreground"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleAccept}
                    className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20"
                >
                    Understood
                </Button>
            </div>
        </div>
    );
}

function GateItem({ icon, title, body }: { icon: string; title: string; body: string }) {
    return (
        <li className="flex gap-3">
            <Icon icon={icon} className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{body}</p>
            </div>
        </li>
    );
}
