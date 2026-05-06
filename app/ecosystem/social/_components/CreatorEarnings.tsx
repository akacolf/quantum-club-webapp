"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useCreatorEarnings } from "@/app/(hooks)/queries/use-social";
import { haptics } from "@/lib/haptics";
import { PAYOUT_MIN_TON } from "@/lib/validations";
import { requestCreatorPayout } from "../pro-actions";

interface Props {
  qcId: string | null;
}

export function CreatorEarnings({ qcId }: Props) {
  const { walletAddress } = useUserContext();
  const { data: earnings } = useCreatorEarnings(qcId);
  const [destination, setDestination] = useState("");
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!earnings || earnings.totalEarnedTon === 0) {
    return null;
  }

  const canRequest = earnings.pendingTon >= PAYOUT_MIN_TON;

  async function submitPayout() {
    const dest = destination.trim() || walletAddress;
    if (!dest) {
      toast.error("Enter a TON address");
      return;
    }
    setSubmitting(true);
    haptics.light();
    const res = await requestCreatorPayout({ destination: dest });
    setSubmitting(false);
    if (res?.serverError) {
      toast.error(res.serverError);
      haptics.error();
      return;
    }
    if (res?.data?.success) {
      haptics.success();
      toast.success(
        `Payout request submitted: ${res.data.amountTon.toFixed(2)} TON`,
      );
      setShowPayoutForm(false);
      setDestination("");
    }
  }

  return (
    <Card className="border-0 p-5 bg-gradient-to-br from-primary/10 via-secondary/30 to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <Icon icon="solar:wallet-money-bold" className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Creator earnings</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-base font-bold">
            {earnings.pendingTon.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">TON</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid out</p>
          <p className="text-base font-bold">
            {earnings.paidOutTon.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">TON</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total earned</p>
          <p className="text-base font-bold">
            {earnings.totalEarnedTon.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">TON</p>
        </div>
      </div>

      {showPayoutForm ? (
        <div className="mt-4 space-y-2">
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={walletAddress ?? "TON address"}
            className="rounded-full"
          />
          <p className="text-xs text-muted-foreground">
            Defaults to your QC wallet if left blank.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 rounded-full"
              disabled={submitting}
              onClick={submitPayout}
            >
              {submitting ? <ButtonLoader size="sm" /> : "Request payout"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPayoutForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          className="mt-4 w-full rounded-full"
          disabled={!canRequest}
          onClick={() => setShowPayoutForm(true)}
        >
          {canRequest
            ? "Request payout"
            : `Min ${PAYOUT_MIN_TON} TON to withdraw`}
        </Button>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Earnings come from your gated post unlocks (80% creator / 20%
        platform). Payouts are processed within 48 hours.
      </p>
    </Card>
  );
}
