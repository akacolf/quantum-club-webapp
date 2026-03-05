"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface NftShareMessageProps {
  nftAddress: string;
  nftName: string;
  nftImage?: string;
  nftPrice?: string;
  collectionName?: string;
  isMine: boolean;
}

export default function NftShareMessage({
  nftAddress,
  nftName,
  nftImage,
  nftPrice,
  collectionName,
}: NftShareMessageProps) {
  const href = nftPrice
    ? `/wallet/marketplace/buy/${encodeURIComponent(nftAddress)}`
    : `/wallet/nft/${encodeURIComponent(nftAddress)}`;

  return (
    <Link href={href} className="block">
      <div className="flex gap-2.5 min-w-[200px] max-w-[260px]">
        <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-muted">
          {nftImage ? (
            <Image
              src={nftImage}
              alt={nftName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon="solar:gallery-minimalistic-linear" className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{nftName}</p>
          {collectionName && (
            <p className="text-[10px] text-muted-foreground truncate">{collectionName}</p>
          )}
          {nftPrice && (
            <p className="text-[10px] text-green-500 font-medium mt-0.5">{nftPrice} TON</p>
          )}
          <p className="text-[10px] text-primary mt-0.5 inline-flex items-center gap-0.5">
            <Icon icon="solar:eye-linear" className="w-3 h-3" />
            View NFT
          </p>
        </div>
      </div>
    </Link>
  );
}
