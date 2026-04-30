"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { useWallet } from "../../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { toast } from "sonner";
import { CHAIN_INFO, type ChainType } from "../../utils/multichain";
import StyledQRCode from "@/components/StyledQRCode";

const isChainType = (value: string): value is ChainType =>
  value === "ton" || value === "eth" || value === "btc" || value === "sol" || value === "trx";

export default function ReceiveAssetPage() {
  useTelegramBackButton("/wallet/receive");
  const params = useParams<{ chain: string }>();
  const chainParam = params.chain;
  const isValidChain = isChainType(chainParam);
  const selectedChain = isValidChain ? chainParam : "ton";
  const chainInfo = CHAIN_INFO[selectedChain];
  const [copied, setCopied] = useState(false);
  const { qcUsername } = useUserContext();
  const {
    walletAddress,
    isTestnet,
    ethAddress,
    btcAddress,
    solAddress,
    trxAddress,
  } = useWallet();

  if (!isValidChain || (isTestnet && selectedChain !== "ton")) {
    return <Loader />;
  }

  const getAddressForChain = (chain: ChainType) => {
    switch (chain) {
      case "ton": return walletAddress;
      case "eth": return ethAddress;
      case "btc": return btcAddress;
      case "sol": return solAddress;
      case "trx": return trxAddress;
      default: return "";
    }
  };

  const address = getAddressForChain(selectedChain);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!address) return;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(address)}&text=${encodeURIComponent(`My ${chainInfo.name} Wallet Address`)}`;

    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  };

  if (!walletAddress) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background px-6 pb-24 pt-7 text-foreground">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">
            Receive {chainInfo.name === "Tron" ? "TRON" : chainInfo.name}
          </h1>
          <p className="text-sm text-neutral-400">Scan the QR code to deposit funds</p>
        </div>

        <div className="relative rounded-3xl bg-white p-1.5 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
          <div className="rounded-[22px] bg-white p-4">
            <StyledQRCode
              data={address || ""}
              image={chainInfo.logo}
              size={200}
            />
          </div>
        </div>

        <div className="mx-auto max-w-xs text-center text-yellow-500">
          <Icon icon="lucide:shield-alert" className="mx-auto mb-2 h-4 w-4"/>
          <p className="text-xs font-bold opacity-80">Warning</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">
            {chainInfo.warningText}
          </p>
        </div>

        {selectedChain === "ton" && qcUsername && (
          <div className="w-full space-y-2">
            <Label className="ml-1 text-xs font-semibold text-muted-foreground">
              Your QC username
            </Label>
            <div
              onClick={() => {
                navigator.clipboard.writeText(`@${qcUsername}`);
                toast.success("Username copied!");
              }}
              className="w-full cursor-pointer rounded-xl border-0 bg-secondary p-4 transition-colors hover:bg-secondary/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="solar:user-id-bold" className="h-4 w-4 text-primary" />
                  <p className="text-base font-bold text-foreground">
                    @{qcUsername}
                  </p>
                </div>
                <Icon icon="solar:copy-bold" className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Others can send TON to your @username
              </p>
            </div>
          </div>
        )}

        <div className="w-full space-y-2">
          <Label className="ml-1 text-xs font-semibold text-muted-foreground">
            Your {chainInfo.symbol} address
          </Label>
          <div
            onClick={copyAddress}
            className="w-full cursor-pointer rounded-xl border-0 bg-secondary p-4 transition-colors hover:bg-secondary/80"
          >
            <p className="break-all font-mono text-sm leading-relaxed text-neutral-300">
              {address}
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 pt-2">
          <Button
            onClick={copyAddress}
            className="h-12 rounded-xl bg-white font-bold text-black shadow-lg shadow-white/5 transition-transform hover:bg-gray-200 active:scale-[0.98]"
          >
            {copied ? <><Icon icon="lucide:check" className="mr-2 h-4 w-4"/> Copied</> : <><Icon icon="lucide:copy" className="mr-2 h-4 w-4"/> Copy</>}
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="h-12 rounded-xl border-0 bg-secondary font-bold text-white transition-transform hover:bg-secondary/80 active:scale-[0.98]"
          >
            <Icon icon="lucide:share-2" className="mr-2 h-4 w-4"/> Share
          </Button>
        </div>
      </div>
    </div>
  );
}
