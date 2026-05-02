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
        <div className="min-h-screen bg-background px-5 pb-6 space-y-6">
            <Icon icon="solar:shield-check-bold" className="w-14 h-14 text-primary" />

            <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground leading-tight">
                    Tokenized stocks notice
                </h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
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

            <p className="text-xs text-neutral-500 leading-relaxed">
                Tap <span className="text-foreground font-medium">Understood</span> to confirm you have
                read the above and qualify under the eligibility statements. Tap{" "}
                <span className="text-foreground font-medium">Cancel</span> to leave this page.
            </p>

            <div className="flex gap-2 pt-2">
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
                <p className="text-xs text-neutral-400 leading-relaxed mt-1">{body}</p>
            </div>
        </li>
    );
}
